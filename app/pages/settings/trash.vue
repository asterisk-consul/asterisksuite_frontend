<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'trash-access']
})

import { h } from 'vue'
import { UBadge, UButton, UCheckbox } from '#components'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { useTrashStore } from '~/modulos/trash/store/trash.store'
import { TRASH_TABLES } from '~/modulos/trash/types/trash.types'
import type { TrashItem, TrashTable } from '~/modulos/trash/types/trash.types'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { CATEGORY_LABELS, getStatusColor, getStatusLabel, isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'

const store = useTrashStore()
const toast = useToast()
const { hasPermission } = useRoles()
const { isOwner } = useCompanyRole()
const canRestoreTrash = computed(() => isOwner.value || hasPermission('trash.restore'))
const canDeleteTrash = computed(() => isOwner.value || hasPermission('trash.delete'))

const search = ref('')
const filterTable = ref<TrashTable | undefined>(undefined)
const filterDays = ref<number>(30)
const selectedIds = ref<string[]>([])
const showDetailModal = ref(false)
const showHardDeleteModal = ref(false)
const confirmAccidentalDocuments = ref(false)
const selectedItem = ref<any>(null)
const actionLoading = ref(false)
const detailLoadingId = ref<string | null>(null)
const permanentlyProtectedTables = new Set(['payments'])

const DAY_OPTIONS = [
  { label: 'Últimos 7 días', value: 7 },
  { label: 'Últimos 15 días', value: 15 },
  { label: 'Últimos 30 días', value: 30 },
  { label: 'Últimos 60 días', value: 60 },
  { label: 'Últimos 90 días', value: 90 },
  { label: 'Todos', value: 0 }
]

const TABLE_LABELS: Record<string, string> = {
  users: 'Usuarios',
  business_parties: 'Partes interesadas',
  companies: 'Empresas',
  delivery_notes: 'Remitos',
  drivers: 'Choferes',
  entity_photos: 'Fotos de entidades',
  files: 'Archivos',
  locations: 'Locaciones',
  pallets: 'Pallets',
  party_locations: 'Locaciones de partes',
  party_contacts: 'Contactos de partes',
  picking_orders: 'Órdenes de picking',
  products: 'Productos',
  trips: 'Viajes',
  trip_stops: 'Paradas de viaje',
  trip_stop_orders: 'Órdenes de parada',
  corridors: 'Corredores',
  corridor_stops: 'Paradas de corredor',
  vehicles: 'Vehículos',
  vehicle_combinations: 'Combinaciones vehiculares',
  warehouses: 'Depósitos',
  document_sequences: 'Secuencias de documento',
  transport_document_types: 'Tipos de doc. transporte',
  documents_vehicle: 'Documentos vehículo',
  documents_driver: 'Documentos chofer',
  transfer_rates: 'Tarifas de transferencia',
  dispatch_rates: 'Tarifas de despacho',
  document_item_taxes: 'Impuestos de ítems',
  document_items: 'Ítems de documento',
  document_taxes: 'Impuestos de documento',
  document_types: 'Tipos de documento',
  documents: 'Documentos',
  product_taxes: 'Impuestos de producto',
  taxes: 'Impuestos',
  product_price: 'Precios de producto',
  accounts: 'Cuentas contables',
  product_attribute_values: 'Valores de atributos',
  attributes: 'Atributos',
  tags: 'Tags',
  categories: 'Categorías',
  product_components: 'Componentes de producto',
  product_variants: 'Variantes de producto',
  units: 'Unidades',
  currency_rates: 'Tasas de cambio',
  currencies: 'Monedas',
  payments: 'Pagos y cobros',
  bank_accounts: 'Cuentas bancarias',
  bank_account_movements: 'Movimientos bancarios'
}

const TABLE_OPTIONS = TRASH_TABLES.map(t => ({ label: TABLE_LABELS[t] || t, value: t }))

function trashStatus(item: TrashItem) {
  if (item.table !== 'documents') return { label: 'En papelera', color: 'neutral' as const }

  if (item.hrValeNeedsReconciliation) {
    return { label: 'Limpieza pendiente', color: 'warning' as const }
  }

  const category = item.documentCategory ?? ''
  const status = Number(item.documentStatus ?? 0)
  if (isDocumentCancelled(category, status, item.documentDirection ?? 1)) {
    const label = category === 'QUOTE'
      ? 'Cancelado'
      : category === 'ORDER'
        ? item.documentDirection === -1 ? 'Anulada' : 'Cancelada'
        : category === 'VALE' || category === 'OPENING_BALANCE'
          ? 'Anulado'
          : 'Anulada'
    return { label, color: 'error' as const }
  }

  if (category === 'VALE') {
    const valeStatuses: Record<number, { label: string; color: 'neutral' | 'warning' | 'success' }> = {
      0: { label: 'Borrador', color: 'neutral' },
      1: { label: 'Pendiente', color: 'warning' },
      2: { label: 'Confirmado', color: 'success' }
    }
    return valeStatuses[status] ?? { label: `Estado ${status}`, color: 'neutral' }
  }

  return {
    label: getStatusLabel(category, status),
    color: getStatusColor(category, status)
  }
}

function valeReconciliationSummary(item: TrashItem) {
  if (item.hrValeReconciliationBlocked) return 'Vale RRHH anulado · tiene un pago activo que primero debe anularse'
  const reasons = [
    item.hrValeDocumentStatusNeedsReconciliation ? 'comprobante sin anular' : null,
    item.hrValePaidAmountNeedsReconciliation ? 'saldo pagado pendiente' : null,
    item.hrValeAccountEntriesNeedReconciliation ? 'asiento activo en cuenta corriente' : null,
    item.hrValeTreasuryNeedsReconciliation ? 'reversión de Tesorería pendiente' : null
  ].filter(Boolean)
  return reasons.length
    ? `Vale RRHH anulado · pendiente: ${reasons.join(', ')}`
    : 'Vale RRHH anulado · falta completar la limpieza'
}

function trashType(item: TrashItem) {
  if (item.table !== 'documents') return TABLE_LABELS[item.table] || item.table
  if (item.documentDirection === 1) return 'Comprobante de venta'
  if (item.documentDirection === -1) return 'Comprobante de compra'
  return 'Comprobante'
}

function trashTypeColor(item: TrashItem) {
  if (item.table !== 'documents') return 'neutral' as const
  if (item.documentDirection === 1) return 'success' as const
  if (item.documentDirection === -1) return 'info' as const
  return 'warning' as const
}

function documentTitle(item: TrashItem) {
  const type = item.documentTypeName || CATEGORY_LABELS[item.documentCategory ?? ''] || 'Documento'
  return item.documentNumber !== undefined && item.documentNumber !== null
    ? `${type} · N.º ${item.documentNumber}`
    : type
}

function renderItem(item: TrashItem) {
  const name = item.table === 'documents' ? documentTitle(item) : item.displayName
  const detail = item.table === 'documents' ? item.documentDescription : item.displayDetail
  return h('div', { class: 'flex min-w-64 flex-col gap-1 py-0.5' }, [
    h('p', { class: 'font-medium text-highlighted', title: name || item.id }, name || 'Registro sin nombre'),
    item.hrValeNeedsReconciliation
      ? h('p', {
          class: 'text-xs font-medium text-warning',
          title: valeReconciliationSummary(item)
        }, valeReconciliationSummary(item))
      : null,
    item.table === 'documents' && item.documentReference
      ? h('p', { class: 'text-sm font-semibold text-primary', title: item.documentReference }, `Ref.: ${item.documentReference}`)
      : null,
    detail
      ? h('p', { class: 'max-w-xl truncate text-xs text-muted', title: detail }, detail)
      : null,
    h('code', { class: 'text-[11px] text-dimmed' }, `ID ${item.id.slice(0, 8)}…`)
  ])
}

const columns: ExtendedColumn<TrashItem>[] = [
  {
    id: 'select',
    header: () => h(UCheckbox, {
      modelValue: allSelected.value,
      disabled: !canRestoreTrash.value && !canDeleteTrash.value,
      'aria-label': 'Seleccionar todos los resultados',
      'onUpdate:modelValue': toggleAll
    }),
    cell: ({ row }) => h(UCheckbox, {
      modelValue: isSelected(row.original),
      disabled: !canRestoreTrash.value && !canDeleteTrash.value,
      'aria-label': `Seleccionar ${trashType(row.original)} ${row.original.id.slice(0, 8)}`,
      'onUpdate:modelValue': () => toggleItem(`${row.original.table}:${row.original.id}`)
    }),
    meta: { label: 'Selección', filter: false, disableColumnVisibility: true }
  },
  {
    id: 'type',
    header: 'Tipo',
    accessorFn: (item) => trashType(item),
    cell: ({ row }) => h(UBadge, {
      label: trashType(row.original),
      color: trashTypeColor(row.original),
      variant: 'subtle'
    })
  },
  {
    id: 'record',
    header: 'Registro',
    accessorFn: (item) => item.displayName || item.documentDescription || item.documentReference || item.id,
    cell: ({ row }) => renderItem(row.original)
  },
  {
    id: 'status',
    header: 'Estado',
    accessorFn: (item) => trashStatus(item).label,
    cell: ({ row }) => h(UBadge, {
      label: trashStatus(row.original).label,
      color: trashStatus(row.original).color,
      variant: 'subtle'
    })
  },
  {
    id: 'deletedAt',
    header: 'En papelera desde',
    accessorFn: (item) => item.deletedAt,
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm' }, formatDate(row.original.deletedAt))
  },
  {
    id: 'deletedBy',
    header: 'Eliminado por',
    accessorFn: (item) => item.deletedByName || '—',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.deletedByName || '—')
  },
  {
    id: 'actions',
    header: 'Acciones',
    meta: { label: 'Acciones', filter: false, disableColumnVisibility: true },
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1.5' }, [
      h(UButton, {
        label: 'Ver',
        icon: 'i-lucide-eye',
        variant: 'soft',
        color: 'neutral',
        size: 'xs',
        onClick: () => openDetail(row.original)
      }),
      row.original.hrValeNeedsReconciliation && canDeleteTrash.value
        ? row.original.hrValeReconciliationBlocked
          ? h(UButton, {
              label: 'Resolver pago',
              icon: 'i-lucide-lock-keyhole',
              variant: 'soft',
              color: 'warning',
              size: 'xs',
              disabled: true,
              title: 'Anulá primero el pago activo asociado al comprobante para poder regularizarlo.'
            })
          : h(UButton, {
              label: 'Completar limpieza',
              icon: 'i-lucide-rotate-ccw',
              variant: 'soft',
              color: 'warning',
              size: 'xs',
              loading: actionLoading.value,
              onClick: () => reconcileValeDocument(row.original)
            })
        : null,
      canRestoreTrash.value
        ? h(UButton, {
            label: 'Restaurar',
            icon: 'i-lucide-undo-2',
            variant: 'soft',
            color: 'success',
            size: 'xs',
            loading: actionLoading.value,
            onClick: () => restoreOne(row.original)
          })
        : null
    ])
  }
]

const filteredItems = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.items
  return store.items.filter(item =>
    item.id.toLowerCase().includes(q) ||
    (TABLE_LABELS[item.table] || item.table).toLowerCase().includes(q) ||
    String(item.documentNumber ?? '').includes(q) ||
    (item.displayName ?? '').toLowerCase().includes(q) ||
    (item.displayDetail ?? '').toLowerCase().includes(q) ||
    (item.documentTypeName ?? '').toLowerCase().includes(q) ||
    (item.documentDescription ?? '').toLowerCase().includes(q) ||
    (item.documentReference ?? '').toLowerCase().includes(q) ||
    trashStatus(item).label.toLowerCase().includes(q)
  )
})

const allSelected = computed(() => {
  if (filteredItems.value.length === 0) return false
  return filteredItems.value.every(item => selectedIds.value.includes(item.table + ':' + item.id))
})

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredItems.value.map(item => item.table + ':' + item.id)
  }
}

function toggleItem(key: string) {
  const idx = selectedIds.value.indexOf(key)
  if (idx === -1) {
    selectedIds.value.push(key)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function isSelected(item: any) {
  return selectedIds.value.includes(item.table + ':' + item.id)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTreasuryAmount(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode || 'ARS'
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`
  }
}

function getTrashRowId(item: TrashItem) {
  return `${item.table}:${item.id}`
}

async function openDetail(item: TrashItem) {
  selectedItem.value = { ...item, hrValeTreasuryImpacts: undefined }
  showDetailModal.value = true
  detailLoadingId.value = null
  if (item.table !== 'documents' || item.documentCategory !== 'VALE' || !item.hrValeId) return

  detailLoadingId.value = item.id
  try {
    const result = await store.getValeTreasuryImpacts(item.id)
    if (selectedItem.value?.id === item.id) {
      selectedItem.value = { ...selectedItem.value, hrValeTreasuryImpacts: result.impacts }
    }
  } catch (error: any) {
    if (selectedItem.value?.id === item.id) {
      toast.add({
        title: 'No se pudo cargar el detalle de Tesorería',
        description: error?.data?.message || error.message,
        color: 'error'
      })
    }
  } finally {
    if (detailLoadingId.value === item.id) detailLoadingId.value = null
  }
}

function parseSelection() {
  const result: { table: string; ids: string[] }[] = []
  for (const key of selectedIds.value) {
    const sep = key.indexOf(':')
    const table = key.substring(0, sep)
    const id = key.substring(sep + 1)
    const existing = result.find(r => r.table === table)
    if (existing) {
      existing.ids.push(id)
    } else {
      result.push({ table, ids: [id] })
    }
  }
  return result
}

const selectionContainsPayments = computed(() =>
  parseSelection().some(group => permanentlyProtectedTables.has(group.table))
)
const selectionContainsDocuments = computed(() =>
  parseSelection().some(group => group.table === 'documents')
)
const selectedValeReconciliationItems = computed(() => {
  const selected = new Set(selectedIds.value)
  return store.items.filter(item => selected.has(getTrashRowId(item)) && item.hrValeNeedsReconciliation)
})

function notifyValeReconciliationRequired() {
  if (!selectedValeReconciliationItems.value.length) return false
  toast.add({
    title: 'Completá la limpieza antes de purgar',
    description: 'El vale RRHH ya está anulado. En cada fila elegí “Completar limpieza” para anular su comprobante y retirar efectos pendientes; solo se revierte caja o banco si todavía falta ese movimiento.',
    color: 'warning',
    icon: 'i-lucide-wrench'
  })
  return true
}

async function restoreSelected() {
  if (selectedIds.value.length === 0) return
  if (!canRestoreTrash.value) return
  actionLoading.value = true
  try {
    const groups = parseSelection()
    for (const group of groups) {
      if (group.ids.length === 1) {
        await store.restore(group.table, group.ids[0]!)
      } else {
        await store.restoreMany(group.table, group.ids)
      }
    }
    toast.add({ title: `${selectedIds.value.length} elemento(s) restaurado(s)`, color: 'success', icon: 'i-lucide-check-circle' })
    selectedIds.value = []
  } catch (e: any) {
    toast.add({ title: 'Error al restaurar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function restoreOne(item: any) {
  if (!canRestoreTrash.value) return
  actionLoading.value = true
  try {
    await store.restore(item.table, item.id)
    toast.add({ title: 'Elemento restaurado', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Error al restaurar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function reconcileValeDocument(item: TrashItem) {
  if (!canDeleteTrash.value || !item.hrValeNeedsReconciliation || item.hrValeReconciliationBlocked) return
  actionLoading.value = true
  try {
    await store.reconcileValeDocument(item.id)
    await loadData()
    toast.add({
      title: 'Limpieza completada',
      description: 'El vale RRHH no se anuló otra vez. Se anuló su comprobante interno y se retiraron los efectos pendientes; caja o banco solo se modificó si faltaba revertir un movimiento. El historial original se conserva.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (e: any) {
    toast.add({ title: 'No se pudo completar la limpieza', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

function confirmHardDelete() {
  if (selectedIds.value.length === 0) return
  if (!canDeleteTrash.value) return
  if (notifyValeReconciliationRequired()) return
  if (selectionContainsPayments.value) {
    toast.add({
      title: 'Los pagos y cobros deben conservarse',
      description: 'Tienen efectos de tesorería y trazabilidad; podés restaurarlos, pero no eliminarlos definitivamente.',
      color: 'warning'
    })
    return
  }
  confirmAccidentalDocuments.value = false
  showHardDeleteModal.value = true
}

async function hardDeleteSelected() {
  if (!canDeleteTrash.value) return
  if (notifyValeReconciliationRequired()) {
    showHardDeleteModal.value = false
    return
  }
  if (selectionContainsDocuments.value && !confirmAccidentalDocuments.value) return
  actionLoading.value = true
  try {
    const groups = parseSelection()
    for (const group of groups) {
      await store.hardDeleteMany(
        group.table,
        group.ids,
        group.table === 'documents' && confirmAccidentalDocuments.value
      )
    }
    toast.add({ title: `${selectedIds.value.length} elemento(s) eliminado(s) permanentemente`, color: 'success', icon: 'i-lucide-check-circle' })
    selectedIds.value = []
    showHardDeleteModal.value = false
  } catch (e: any) {
    toast.add({ title: 'Error al eliminar', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function loadData() {
  const params: { days?: number; table?: TrashTable } = {}
  if (filterDays.value > 0) params.days = filterDays.value
  if (filterTable.value) params.table = filterTable.value
  await store.fetchAll(params)
}

watch([filterDays, filterTable], () => {
  selectedIds.value = []
  loadData()
})

watch(showHardDeleteModal, (open) => {
  if (!open) confirmAccidentalDocuments.value = false
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Papelera" description="Elementos eliminados del sistema. Restaurá o eliminá permanentemente." />

    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar comprobante, persona, producto, referencia o ID..."
        class="flex-1 min-w-[200px] max-w-sm"
      />
      <USelectMenu
        v-model="filterTable"
        :items="TABLE_OPTIONS"
        value-key="value"
        :search-input="{ placeholder: 'Buscar tabla...', icon: 'i-lucide-search' }"
        clear
        placeholder="Todas las tablas"
        class="w-56"
      />
      <USelect
        v-model="filterDays"
        :items="DAY_OPTIONS"
        placeholder="Período"
        class="w-44"
      />
      <UBadge
        :label="`${filteredItems.length.toLocaleString('es-AR')} ${filteredItems.length === 1 ? 'elemento' : 'elementos'}`"
        color="neutral"
        variant="subtle"
      />
    </div>

    <div v-if="selectedIds.length > 0" class="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div>
        <p class="text-sm font-medium">{{ selectedIds.length }} seleccionado(s)</p>
        <p v-if="selectionContainsDocuments" class="text-xs text-muted">
          Un comprobante que nunca se confirmó debe quedar como borrador; si ya se confirmó, debe quedar anulado antes de llegar a la papelera. Si ves otro estado, regularizalo desde su flujo antes de purgarlo.
        </p>
        <p v-if="selectedValeReconciliationItems.length" class="text-xs font-medium text-warning">
          {{ selectedValeReconciliationItems.length }} vale(s) requieren “Completar limpieza” desde su fila antes de purgarlos.
        </p>
        <p v-if="selectionContainsPayments" class="text-xs text-muted">
          Los pagos y cobros se pueden restaurar, pero conservan sus efectos de tesorería permanentemente.
        </p>
      </div>
      <div class="flex gap-2 ms-auto">
        <UButton
          v-if="canRestoreTrash"
          label="Restaurar"
          icon="i-lucide-undo-2"
          color="success"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="restoreSelected"
        />
        <UButton
          v-if="canDeleteTrash"
          label="Eliminar permanentemente"
          icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          :title="selectionContainsPayments ? 'Los pagos y cobros deben conservarse por trazabilidad' : undefined"
          @click="confirmHardDelete"
        />
      </div>
    </div>

    <div v-if="store.loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
    </div>

    <div v-else-if="filteredItems.length === 0" class="py-16 text-center">
      <UIcon name="i-lucide-trash-2" class="mx-auto mb-3 text-4xl text-muted" />
      <p class="text-sm text-muted">No hay elementos en la papelera</p>
    </div>

    <AsteriskTable
      v-else
      :data="filteredItems"
      :columns="columns"
      :page-size="Math.max(filteredItems.length, 1)"
      :table-min-width="1080"
      :get-row-id="getTrashRowId"
      storage-key="settings-trash"
      hide-toolbar
      hide-footer
      compact
    />

    <!-- Detail Modal -->
    <UModal v-model:open="showDetailModal" title="Detalle del elemento">
      <template #body>
        <div v-if="selectedItem" class="space-y-3">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-muted">Tabla:</span>
              <p class="font-medium">{{ TABLE_LABELS[selectedItem.table] || selectedItem.table }}</p>
            </div>
            <div>
              <span class="text-muted">ID:</span>
              <p class="font-mono text-xs">{{ selectedItem.id }}</p>
            </div>
            <div>
              <span class="text-muted">Eliminado el:</span>
              <p>{{ formatDate(selectedItem.deletedAt) }}</p>
            </div>
            <div>
              <span class="text-muted">Eliminado por:</span>
              <p>{{ selectedItem.deletedByName || '—' }}</p>
            </div>
            <div>
              <span class="text-muted">Estado:</span>
              <p>{{ trashStatus(selectedItem).label }}</p>
            </div>
            <div v-if="selectedItem.displayName">
              <span class="text-muted">Registro:</span>
              <p class="font-medium">{{ selectedItem.displayName }}</p>
            </div>
            <div v-if="selectedItem.displayDetail">
              <span class="text-muted">Datos:</span>
              <p>{{ selectedItem.displayDetail }}</p>
            </div>
          </div>
          <div v-if="selectedItem.table === 'documents'" class="rounded-lg border border-default p-3 text-sm">
            <p class="font-semibold">
              {{ selectedItem.documentTypeName || 'Documento' }} #{{ selectedItem.documentNumber }}
            </p>
            <p v-if="selectedItem.documentDescription" class="mt-1 text-muted">{{ selectedItem.documentDescription }}</p>
            <p v-if="selectedItem.documentReference" class="mt-1"><span class="text-muted">Referencia:</span> {{ selectedItem.documentReference }}</p>
            <p class="mt-2 text-xs text-muted">
              Solo se purgan comprobantes manuales en borrador o anulados que no tengan autorización fiscal ni relaciones operativas. Los asientos de cuenta corriente deben estar dados de baja; se eliminan sin modificar el saldo.
            </p>
          </div>
          <div v-if="selectedItem.hrValeNeedsReconciliation" class="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
            <h3 class="font-semibold">Qué falta completar</h3>
            <ul class="mt-2 list-disc space-y-1 ps-5 text-xs text-muted">
              <li v-if="selectedItem.hrValeReconciliationBlocked">Hay un pago activo asociado; anulalo primero.</li>
              <li v-if="selectedItem.hrValeDocumentStatusNeedsReconciliation">El comprobante interno todavía no está anulado.</li>
              <li v-if="selectedItem.hrValePaidAmountNeedsReconciliation">El saldo pagado del comprobante no está en cero.</li>
              <li v-if="selectedItem.hrValeAccountEntriesNeedReconciliation">El comprobante conserva asientos activos de cuenta corriente.</li>
              <li v-if="selectedItem.hrValeTreasuryNeedsReconciliation">Falta el movimiento inverso de caja o banco.</li>
            </ul>
          </div>
          <div v-if="selectedItem.hrValeId" class="rounded-lg border border-default p-3 text-sm">
            <h3 class="font-semibold">Tesorería relacionada</h3>
            <p v-if="detailLoadingId === selectedItem.id" class="mt-2 text-xs text-muted">
              Buscando los movimientos asociados…
            </p>
            <div v-else class="mt-2">
              <p v-if="selectedItem.hrValeTreasuryNeedsReconciliation" class="text-xs text-warning">
                Falta registrar la reversión del movimiento original; ese importe todavía afecta la caja o el banco.
              </p>
              <p v-else-if="selectedItem.hrValeDocumentNeedsReconciliation && selectedItem.hrValeTreasuryImpacts?.length" class="text-xs text-muted">
                No falta una reversión directa del vale. El pendiente corresponde al comprobante o su cuenta corriente.
              </p>
              <p v-else-if="selectedItem.hrValeDocumentNeedsReconciliation" class="text-xs text-muted">
                No hay movimientos de caja o banco asociados. El pendiente corresponde al comprobante o su cuenta corriente, no a Tesorería.
              </p>
              <div v-if="selectedItem.hrValeTreasuryImpacts?.length" class="mt-3 divide-y divide-default">
                <div
                  v-for="impact in selectedItem.hrValeTreasuryImpacts"
                  :key="impact.id"
                  class="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium">{{ impact.accountLabel }}</p>
                    <p class="text-xs text-muted">{{ impact.movementLabel }} · {{ formatDate(impact.date) }}</p>
                  </div>
                  <span :class="impact.amount >= 0 ? 'text-success' : 'text-error'" class="shrink-0 font-semibold tabular-nums">
                    {{ formatTreasuryAmount(impact.amount, impact.currencyCode) }}
                  </span>
                </div>
              </div>
              <p v-else class="mt-2 text-xs text-muted">
                No se encontraron movimientos de caja o banco vinculados a este vale.
              </p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cerrar" variant="ghost" @click="() => { showDetailModal = false }" />
          <UButton
            v-if="canRestoreTrash"
            label="Restaurar"
            icon="i-lucide-undo-2"
            color="success"
            :loading="actionLoading"
            @click="restoreOne(selectedItem); showDetailModal = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Hard Delete Confirmation Modal -->
    <UModal v-model:open="showHardDeleteModal" title="Eliminar permanentemente">
      <template #body>
        <p class="text-sm">
          Vas a eliminar <strong>{{ selectedIds.length }} elemento(s)</strong> permanentemente.
          Esta acción <strong class="text-error">no se puede deshacer</strong>.
        </p>
        <UAlert
          v-if="selectionContainsDocuments"
          class="mt-3"
          color="warning"
          variant="soft"
          icon="i-lucide-shield-alert"
          title="Validación de seguridad"
          description="Solo se purgan comprobantes manuales en Borrador o Anulados que no tengan autorización fiscal, pagos, cadena documental ni relaciones operativas. Un comprobante confirmado debe anularse antes de llegar a la papelera. No debe tener movimientos activos de stock, caja o banco. Los asientos de cuenta corriente deben estar dados de baja; se quitan sin volver a modificar el saldo. Los saldos iniciales tienen un flujo propio. Los números de secuencia no se reutilizan."
        />
        <label v-if="selectionContainsDocuments" class="mt-3 flex items-start gap-2 text-sm">
          <UCheckbox v-model="confirmAccidentalDocuments" class="mt-0.5" />
          <span>Confirmo que los comprobantes seleccionados se cargaron por error y no representan documentos reales emitidos o recibidos ni operaciones vigentes.</span>
        </label>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="() => { showHardDeleteModal = false }" />
          <UButton
            label="Eliminar permanentemente"
            color="error"
            icon="i-lucide-trash-2"
            :loading="actionLoading"
            :disabled="selectionContainsDocuments && !confirmAccidentalDocuments"
            @click="hardDeleteSelected"
          />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
