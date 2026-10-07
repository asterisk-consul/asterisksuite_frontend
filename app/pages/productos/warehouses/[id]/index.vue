<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useStockStore } from '~/modulos/logistica/warehouses/stock/stock.store'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'
import { useExcelExport } from '~/composables/useExcelExport'
import { warehouseFormFields } from '~/modulos/logistica/warehouses/warehouse/warehouseFormFields'
import { movementColumns, MOVEMENT_TYPE_OPTIONS, DIRECTION_OPTIONS } from '~/modulos/logistica/warehouses/stock/movementColumns'
import { warehouseStockColumns } from '~/modulos/logistica/warehouses/stock/stockColumns'
import ModalForm from '~/components/ModalForm.vue'
import TransferFromWarehouseModal from '~/modulos/logistica/warehouses/stock/components/TransferFromWarehouseModal.vue'
import type { ButtonProps } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'
import type { WarehouseStockItem } from '~/modulos/logistica/warehouses/stock/stock.types'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const warehouseId = computed(() => route.params.id as string)
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canConfigureReplenishment = computed(() => isOwnerOrAdmin.value || hasPermission('stock.replenishment.configure'))

const depositosStore = useDepositosStore()
const stockStore = useStockStore()
const unitsStore = useUnitsStore()
const locationsStore = useLocationsStore()

const { current: warehouse, loading: warehouseLoading } = storeToRefs(depositosStore)
const { stock, movements, loading: stockLoading } = storeToRefs(stockStore)
const { items: units } = storeToRefs(unitsStore)
const { items: locations } = storeToRefs(locationsStore)

const { items: locationItems } = useLocations(locations)

useBreadcrumbEntityLabel(
  computed(() => `/productos/warehouses/${warehouseId.value}`),
  computed(() => warehouse.value?.name)
)

// All warehouses for transfer
const { warehouses } = storeToRefs(depositosStore)

// Edit modal
const editModalOpen = ref(false)
const editRow = ref<any>(null)

// Transfer modal
const showTransferModal = ref(false)
const showReservationModal = ref(false)
const reservations = ref<any[]>([])
const reservationSaving = ref(false)
const reservationForm = reactive({ product_id: '', quantity: 1, reason: '', expires_at: '' })

// Replenishment policy for a product in this warehouse
const replenishmentOpen = ref(false)
const replenishmentSaving = ref(false)
const replenishmentEditingId = ref<string | null>(null)
const replenishmentProduct = ref<WarehouseStockItem['products'] | null>(null)
const replenishmentForm = reactive({ reorder_point: 0, target_stock: 0, lead_time_days: 0, active: true })

async function openReplenishmentPolicy(item: WarehouseStockItem) {
  replenishmentProduct.value = item.products
  replenishmentEditingId.value = null
  Object.assign(replenishmentForm, { reorder_point: 0, target_stock: 0, lead_time_days: 0, active: true })
  replenishmentOpen.value = true
  try {
    const policies = await $fetch<any[]>(`/api/backend/warehouse/replenishment/policies/product/${item.product_id}`)
    const policy = policies.find(value => value.warehouse_id === warehouseId.value)
    if (policy) {
      replenishmentEditingId.value = policy.id
      Object.assign(replenishmentForm, {
        reorder_point: Number(policy.reorder_point),
        target_stock: Number(policy.target_stock),
        lead_time_days: Number(policy.lead_time_days),
        active: Boolean(policy.active)
      })
    }
  } catch (error: any) {
    replenishmentOpen.value = false
    toast.add({ title: 'No se pudo cargar la política', description: error?.data?.message || error?.message, color: 'error' })
  }
}

async function saveReplenishmentPolicy() {
  if (!replenishmentProduct.value) return
  if (replenishmentForm.target_stock < replenishmentForm.reorder_point) {
    toast.add({ title: 'Revisá las cantidades', description: 'El stock objetivo debe ser igual o mayor al punto de reposición.', color: 'warning' })
    return
  }
  replenishmentSaving.value = true
  try {
    await $fetch(replenishmentEditingId.value
      ? `/api/backend/warehouse/replenishment/policies/${replenishmentEditingId.value}`
      : '/api/backend/warehouse/replenishment/policies', {
      method: replenishmentEditingId.value ? 'PATCH' : 'POST',
      body: {
        product_id: replenishmentProduct.value.id,
        warehouse_id: warehouseId.value,
        reorder_point: Number(replenishmentForm.reorder_point),
        target_stock: Number(replenishmentForm.target_stock),
        lead_time_days: Number(replenishmentForm.lead_time_days),
        active: replenishmentForm.active
      }
    })
    replenishmentOpen.value = false
    toast.add({ title: replenishmentEditingId.value ? 'Política actualizada' : 'Política creada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    replenishmentSaving.value = false
  }
}

// Movement history
const showMovements = ref(false)

const unitOptions = computed(() =>
  units.value
    .filter((u) => u.active)
    .map((u) => ({
      label: `${u.name} (${u.symbol})`,
      value: u.id
    }))
)

const fields = computed(() =>
  warehouseFormFields.map((field) => {
    if (field.name === 'locationId') {
      return { ...field, options: locationItems.value, disabled: locationItems.value.length === 0 }
    }
    if (field.name === 'unitId') {
      return { ...field, options: unitOptions.value, disabled: unitOptions.value.length === 0 }
    }
    return field
  })
)

function openEdit() {
  if (!warehouse.value) return
  editRow.value = {
    ...warehouse.value,
    locationId: warehouse.value.locationId ?? (warehouse.value as any).locations?.id ?? null,
    unitId: warehouse.value.unitId ?? (warehouse.value as any).units?.id ?? null
  }
  editModalOpen.value = true
}

async function handleEditSubmit(data: any) {
  await depositosStore.updateWarehouse(warehouseId.value, {
    name: data.name,
    code: data.code,
    locationId: data.locationId,
    unitId: data.unitId,
    active: data.active
  })
  await depositosStore.fetchById(warehouseId.value)
  editModalOpen.value = false
}

// Transfer handler
async function handleTransfer(data: { from_warehouse_id: string; to_warehouse_id: string; product_id: string; quantity: string }) {
  try {
    await stockStore.transferStock({
      product_id: data.product_id,
      from_warehouse_id: data.from_warehouse_id,
      to_warehouse_id: data.to_warehouse_id,
      quantity: data.quantity
    })
    showTransferModal.value = false
    toast.add({ title: 'Transferencia realizada', color: 'success' })
    await stockStore.fetchStock(warehouseId.value)
    if (showMovements.value) {
      await stockStore.fetchMovements(warehouseId.value)
    }
  } catch (err: any) {
    toast.add({
      title: 'Error en transferencia',
      color: 'error',
      description: err?.data?.message || err?.message || 'Error desconocido'
    })
  }
}

async function loadReservations() {
  reservations.value = await $fetch<any[]>('/api/backend/warehouse/stock-reservations', {
    query: { warehouse_id: warehouseId.value }
  }).catch(() => [])
}

async function createReservation() {
  if (!reservationForm.product_id || reservationForm.quantity <= 0 || !reservationForm.reason.trim()) {
    toast.add({ title: 'Completá producto, cantidad y motivo', color: 'warning' })
    return
  }
  reservationSaving.value = true
  try {
    await $fetch('/api/backend/warehouse/stock-reservations', {
      method: 'POST',
      body: {
        warehouse_id: warehouseId.value,
        product_id: reservationForm.product_id,
        quantity: Number(reservationForm.quantity),
        reason: reservationForm.reason,
        expires_at: reservationForm.expires_at || undefined
      }
    })
    Object.assign(reservationForm, { product_id: '', quantity: 1, reason: '', expires_at: '' })
    showReservationModal.value = false
    await Promise.all([stockStore.fetchStock(warehouseId.value), loadReservations()])
    toast.add({ title: 'Stock reservado', description: 'La existencia física no cambió; se redujo la disponibilidad.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo reservar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    reservationSaving.value = false
  }
}

async function releaseReservation(id: string) {
  try {
    await $fetch(`/api/backend/warehouse/stock-reservations/${id}/release`, { method: 'PATCH' })
    await Promise.all([stockStore.fetchStock(warehouseId.value), loadReservations()])
    toast.add({ title: 'Reserva liberada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo liberar', description: error?.data?.message || error?.message, color: 'error' })
  }
}

const reservableProductOptions = computed(() => stock.value
  .filter(item => Number(item.quantity) - Number(item.reserved_quantity) > 0)
  .map(item => ({
    label: `${(item as any).products?.sku ? `${(item as any).products.sku} · ` : ''}${(item as any).products?.name || item.product_id} · disponible: ${Number(item.quantity) - Number(item.reserved_quantity)}`,
    value: item.product_id
  })))

const activeReservations = computed(() => reservations.value.filter(item => ['ACTIVE', 'PARTIALLY_CONSUMED'].includes(item.status)))

// Load movements
async function loadMovements() {
  showMovements.value = !showMovements.value
  if (showMovements.value) {
    await stockStore.fetchMovements(warehouseId.value)
  }
}

// Movements table filters
const movementFilterFields = [
  { id: 'products', label: 'Filtrar por producto...', icon: 'i-lucide-package', class: 'w-48' },
  { id: 'movement_type', label: 'Filtrar por tipo...', icon: 'i-lucide-tag', class: 'w-40' },
  { id: 'direction', label: 'Filtrar por dirección...', icon: 'i-lucide-arrow-right-left', class: 'w-40' }
]

// Export to Excel
const { exportToExcel } = useExcelExport()

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  'MANUAL': 'Manual',
  'TRANSFER': 'Transferencia',
  'PICKING': 'Picking',
  'REMOVAL': 'Baja',
  'DOCUMENT': 'Documento',
  'DELIVERY_NOTE': 'Remito'
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  'STOCK_TRANSFER': 'Transferencia entre depósitos',
  'PALLET_TRANSFER': 'Transferencia de pallet',
  'STOCK_REMOVAL': 'Baja de stock',
  'PICKING': 'Picking directo',
  'PICKING_ORDER': 'Orden de picking',
  'document': 'Documento ERP',
  'DELIVERY_NOTE': 'Remito de logística'
}

function exportMovementsToExcel() {
  exportToExcel({
    filename: `movimientos-${warehouse.value?.name || 'deposito'}-${new Date().toISOString().slice(0, 10)}`,
    sheetName: 'Movimientos',
    columns: [
      { key: 'created_at', label: 'Fecha', width: 20, format: (v: any) => v ? new Date(v).toLocaleString('es-AR') : '' },
      { key: 'product_name', label: 'Producto', width: 30, format: (_: any, row: any) => row.products?.name || '' },
      { key: 'product_sku', label: 'SKU', width: 15, format: (_: any, row: any) => row.products?.sku || '' },
      { key: 'direction', label: 'Dirección', width: 12, format: (v: any) => v === 'IN' ? 'Entrada' : 'Salida' },
      { key: 'movement_type', label: 'Tipo', width: 15, format: (v: any) => MOVEMENT_TYPE_LABELS[v] || v },
      { key: 'quantity', label: 'Cantidad', width: 12, format: (v: any, row: any) => `${row.direction === 'IN' ? '+' : '-'}${parseFloat(v).toFixed(2)}` },
      { key: 'balance_before', label: 'Saldo', width: 12, format: (v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : '' },
      { key: 'reference_type', label: 'Referencia', width: 25, format: (v: any) => v ? (REFERENCE_TYPE_LABELS[v] || v) : '' },
      { key: 'linked_warehouse_name', label: 'Depósito vinculado', width: 25, format: (v: any, row: any) => v ? `${row.direction === 'OUT' ? '→' : '←'} ${v}` : '' },
      { key: 'created_by_name', label: 'Usuario', width: 20, format: (v: any) => v || '' }
    ],
    data: movements.value.map((m) => ({
      ...m,
      product_name: (m as any).products?.name || '',
      product_sku: (m as any).products?.sku || ''
    }))
  })
}

// Print movements
function printMovements() {
  const warehouseName = warehouse.value?.name || 'Depósito'

  const rows = movements.value.map((m) => {
    const qty = parseFloat(m.quantity)
    const prefix = m.direction === 'IN' ? '+' : '-'
    const qtyColor = m.direction === 'IN' ? '#16a34a' : '#dc2626'
    const balance = m.balance_before !== null && m.balance_before !== undefined ? Number(m.balance_before).toFixed(2) : '—'
    const refLabel = m.reference_type ? (REFERENCE_TYPE_LABELS[m.reference_type] || m.reference_type) : '—'
    const userName = (m as any).created_by_name || ''
    const date = new Date(m.created_at).toLocaleString('es-AR')
    const productName = (m as any).products?.name || m.product_id
    const typeLabel = MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type
    const linkedName = (m as any).linked_warehouse_name
    const linkedLabel = linkedName ? `${m.direction === 'OUT' ? '→' : '←'} ${linkedName}` : '—'

    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${date}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:500">${productName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:${qtyColor};font-weight:600">${prefix}${qty.toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:500">${balance}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${typeLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${refLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${linkedLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${userName}</td>
      </tr>
    `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Movimientos - ${warehouseName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #d1d5db; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>Movimientos de stock — ${warehouseName}</h1>
      <div class="subtitle">${movements.value.length} movimientos • ${new Date().toLocaleString('es-AR')}</div>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Saldo</th>
            <th>Tipo</th>
            <th>Referencia</th>
            <th>Depósito vinculado</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }
}

// Resumen operativo por producto. No se suman cantidades de artículos distintos.
const productsWithAvailability = computed(() => stock.value.filter(item =>
  Number(item.quantity) - Number(item.reserved_quantity) > 0
).length)
const productsWithReservations = computed(() => stock.value.filter(item => Number(item.reserved_quantity) > 0).length)
const productsWithoutAvailability = computed(() => stock.value.filter(item =>
  Number(item.quantity) - Number(item.reserved_quantity) <= 0
).length)

type QuickStockFilter = 'stored' | 'available' | 'reserved' | 'unavailable'
const quickStockFilter = ref<QuickStockFilter | null>(null)
const visibleStock = computed(() => {
  if (quickStockFilter.value === 'stored') {
    return stock.value
  }
  if (quickStockFilter.value === 'available') {
    return stock.value.filter(item => Number(item.quantity) - Number(item.reserved_quantity) > 0)
  }
  if (quickStockFilter.value === 'reserved') {
    return stock.value.filter(item => Number(item.reserved_quantity) > 0)
  }
  if (quickStockFilter.value === 'unavailable') {
    return stock.value.filter(item => Number(item.quantity) - Number(item.reserved_quantity) <= 0)
  }
  return stock.value
})

function toggleQuickStockFilter(filter: QuickStockFilter) {
  quickStockFilter.value = quickStockFilter.value === filter ? null : filter
}

const quickStockFilterMeta = computed(() => {
  const filters = {
    stored: { label: 'Productos almacenados', color: 'primary' },
    available: { label: 'Con disponibilidad', color: 'success' },
    reserved: { label: 'Con reservas', color: 'warning' },
    unavailable: { label: 'Sin disponibilidad', color: 'error' }
  } as const
  return quickStockFilter.value ? filters[quickStockFilter.value] : null
})

const stockFilterFields = [
  { id: 'products', label: 'Buscar por producto...', icon: 'i-lucide-search', class: 'w-64' },
  { id: 'sku', label: 'Buscar por SKU...', icon: 'i-lucide-barcode', class: 'w-48' },
  { id: 'availability_status', label: 'Filtrar por situación...', icon: 'i-lucide-package-check', class: 'w-48' }
]

const stockSortFields = [
  { label: 'Producto', value: 'products' },
  { label: 'SKU', value: 'sku' },
  { label: 'Stock físico', value: 'quantity' },
  { label: 'Reservado', value: 'reserved_quantity' },
  { label: 'Disponible', value: 'available_quantity' }
]

const warehouseStockColumnsWithActions = computed<TableColumn<WarehouseStockItem>[]>(() => {
  if (!canConfigureReplenishment.value || warehouse.value?.is_virtual) return warehouseStockColumns
  const UButton = resolveComponent('UButton')
  return [
    ...warehouseStockColumns,
    {
      id: 'replenishment_policy',
      header: 'Reposición',
      cell: ({ row }: any) => h(UButton, {
        label: 'Configurar',
        icon: 'i-lucide-gauge',
        size: 'xs',
        color: 'neutral',
        variant: 'outline',
        onClick: () => openReplenishmentPolicy(row.original)
      })
    }
  ]
})

const unitSymbol = computed(() => warehouse.value?.units?.symbol ?? '')

onMounted(async () => {
  await Promise.all([
    fetchMyPermissionsIfNeeded(),
    depositosStore.fetchById(warehouseId.value),
    depositosStore.fetchAll(),
    stockStore.fetchStock(warehouseId.value),
    unitsStore.fetchAll(),
    locationsStore.fetchAll(),
    loadReservations()
  ])
})

const links = ref<ButtonProps[]>([
  {
    label: 'Reservar stock',
    icon: 'i-lucide-bookmark-plus',
    onClick: () => { showReservationModal.value = true },
    color: 'warning',
    variant: 'outline'
  },
  {
    label: 'Transferir',
    icon: 'i-lucide-arrow-right-left',
    onClick: () => { showTransferModal.value = true },
    color: 'primary',
    variant: 'outline'
  },
  {
    label: 'Editar',
    icon: 'i-heroicons-pencil',
    onClick: openEdit,
    color: 'neutral',
    variant: 'outline'
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/productos/warehouses"
          size="sm"
        />
        <div v-if="warehouse">
          <h1 class="text-xl font-bold">{{ warehouse.name }}</h1>
          <p class="text-sm text-muted">
            {{ warehouse.code || 'Sin código' }}
            <span v-if="(warehouse as any).units"> · {{ (warehouse as any).units.symbol }}</span>
            <span v-if="(warehouse as any).locations">
              · {{ (warehouse as any).locations.address || '' }} {{ (warehouse as any).locations.city || '' }}
            </span>
          </p>
        </div>
        <div v-else-if="warehouseLoading">
          <USkeleton class="h-6 w-48" />
        </div>
      </div>

      <div v-if="warehouse">
        <UPageHeader
          :title="''"
          :links="links"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="stockLoading" class="space-y-4">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
      </div>
      <USkeleton class="h-64" />
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <UPageCard
          variant="subtle"
          role="button"
          tabindex="0"
          :aria-pressed="quickStockFilter === 'stored'"
          class="cursor-pointer transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
          :class="quickStockFilter === 'stored' ? 'border-primary bg-primary/10 ring-1 ring-primary' : ''"
          @click="toggleQuickStockFilter('stored')"
          @keydown.enter.space.prevent="toggleQuickStockFilter('stored')"
        >
          <div class="flex items-center gap-3"><div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-package" class="size-5" /></div><div><p class="text-xs text-muted">Productos almacenados</p><p class="text-2xl font-semibold">{{ stock.length }}</p></div></div>
        </UPageCard>
        <UPageCard
          variant="subtle"
          role="button"
          tabindex="0"
          :aria-pressed="quickStockFilter === 'available'"
          class="cursor-pointer transition hover:border-success/50 hover:bg-success/5 focus-visible:outline-2 focus-visible:outline-success"
          :class="quickStockFilter === 'available' ? 'border-success bg-success/10 ring-1 ring-success' : ''"
          @click="toggleQuickStockFilter('available')"
          @keydown.enter.space.prevent="toggleQuickStockFilter('available')"
        >
          <div class="flex items-center gap-3"><div class="rounded-lg bg-success/10 p-2 text-success"><UIcon name="i-lucide-package-check" class="size-5" /></div><div><p class="text-xs text-muted">Con disponibilidad</p><p class="text-2xl font-semibold text-success">{{ productsWithAvailability }}</p></div></div>
        </UPageCard>
        <UPageCard
          variant="subtle"
          role="button"
          tabindex="0"
          :aria-pressed="quickStockFilter === 'reserved'"
          class="cursor-pointer transition hover:border-warning/50 hover:bg-warning/5 focus-visible:outline-2 focus-visible:outline-warning"
          :class="quickStockFilter === 'reserved' ? 'border-warning bg-warning/10 ring-1 ring-warning' : ''"
          @click="toggleQuickStockFilter('reserved')"
          @keydown.enter.space.prevent="toggleQuickStockFilter('reserved')"
        >
          <div class="flex items-center gap-3"><div class="rounded-lg bg-warning/10 p-2 text-warning"><UIcon name="i-lucide-bookmark" class="size-5" /></div><div><p class="text-xs text-muted">Con reservas</p><p class="text-2xl font-semibold text-warning">{{ productsWithReservations }}</p></div></div>
        </UPageCard>
        <UPageCard
          variant="subtle"
          role="button"
          tabindex="0"
          :aria-pressed="quickStockFilter === 'unavailable'"
          class="cursor-pointer transition hover:border-error/50 hover:bg-error/5 focus-visible:outline-2 focus-visible:outline-error"
          :class="quickStockFilter === 'unavailable' ? 'border-error bg-error/10 ring-1 ring-error' : ''"
          @click="toggleQuickStockFilter('unavailable')"
          @keydown.enter.space.prevent="toggleQuickStockFilter('unavailable')"
        >
          <div class="flex items-center gap-3"><div class="rounded-lg bg-error/10 p-2 text-error"><UIcon name="i-lucide-package-x" class="size-5" /></div><div><p class="text-xs text-muted">Sin disponibilidad</p><p class="text-2xl font-semibold text-error">{{ productsWithoutAvailability }}</p></div></div>
        </UPageCard>
      </div>

      <!-- Stock Table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Productos en este depósito</h3>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="quickStockFilterMeta"
                :label="quickStockFilterMeta.label"
                :color="quickStockFilterMeta.color"
                variant="subtle"
              />
              <span class="text-sm text-muted">
                {{ visibleStock.length }} de {{ stock.length }} producto{{ stock.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </template>

        <div v-if="stock.length === 0" class="text-center py-8 text-muted">
          <p>Este depósito no tiene stock registrado.</p>
        </div>

        <LogisticaTable
          v-else
          :data="visibleStock"
          :columns="warehouseStockColumnsWithActions"
          :filter-fields="stockFilterFields"
          :sort-fields="stockSortFields"
        />
      </UCard>

      <UCard v-if="activeReservations.length">
        <template #header>
          <div><h3 class="text-sm font-semibold">Reservas activas</h3><p class="text-xs text-muted">Origen y saldo comprometido sin salida física.</p></div>
        </template>
        <div class="divide-y divide-default">
          <div v-for="reservation in activeReservations" :key="reservation.id" class="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium">{{ reservation.product?.name }}</p>
                <UBadge :label="reservation.reservation_type === 'MANUAL' ? 'Manual' : 'Orden de venta'" :color="reservation.reservation_type === 'MANUAL' ? 'warning' : 'primary'" variant="soft" />
              </div>
              <p class="text-sm text-muted">{{ reservation.reason || 'Sin motivo' }}</p>
              <NuxtLink v-if="reservation.source_type === 'SALES_ORDER' && reservation.source_id" :to="`/erp/sales/${reservation.source_id}`" class="text-xs font-medium text-primary hover:underline">Ver Orden de Venta</NuxtLink>
              <p v-if="reservation.expires_at" class="text-xs text-muted">Vence: {{ new Date(reservation.expires_at).toLocaleDateString('es-AR') }}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right"><p class="text-xs text-muted">Pendiente</p><p class="font-semibold tabular-nums text-warning">{{ Number(reservation.quantity_reserved) - Number(reservation.quantity_consumed) - Number(reservation.quantity_released) }}</p></div>
              <UButton v-if="reservation.reservation_type === 'MANUAL'" label="Liberar" icon="i-lucide-unlock" size="xs" color="neutral" variant="outline" @click="releaseReservation(reservation.id)" />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Movements History -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                class="text-sm font-semibold hover:text-primary flex items-center gap-2"
                @click="loadMovements"
              >
                <UIcon :name="showMovements ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
                Historial de movimientos
              </button>
              <span class="text-sm text-muted">({{ movements.length }})</span>
            </div>
            <div v-if="showMovements && movements.length > 0" class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-file-spreadsheet"
                label="Excel"
                @click="exportMovementsToExcel"
              />
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-printer"
                label="Imprimir"
                @click="printMovements"
              />
            </div>
          </div>
        </template>

        <div v-if="showMovements">
          <div v-if="movements.length === 0" class="text-center py-4 text-muted">
            No hay movimientos registrados.
          </div>

          <LogisticaTable
            v-else
            :data="movements"
            :columns="movementColumns"
            :filter-fields="movementFilterFields"
          />
        </div>
      </UCard>
    </template>

    <!-- Edit Modal -->
    <ModalForm
      v-model:open="editModalOpen"
      :fields="fields"
      title="Editar Depósito"
      :initial-values="editRow"
      @submit="handleEditSubmit"
    />

    <!-- Transfer Modal -->
    <TransferFromWarehouseModal
      v-model:open="showTransferModal"
      :warehouse-id="warehouseId"
      :warehouse-name="warehouse?.name || ''"
      :warehouse-symbol="(warehouse as any)?.units?.symbol"
      :stock="stock"
      :warehouses="warehouses"
      @submit="handleTransfer"
    />

    <UModal v-model:open="showReservationModal" title="Reserva manual de stock" description="Compromete disponibilidad sin retirar físicamente el producto.">
      <template #body>
        <div class="space-y-4">
          <UAlert color="neutral" variant="subtle" icon="i-lucide-info" title="El stock sigue dentro del depósito" description="La reserva reduce lo disponible para ventas posteriores. Podrás liberarla mientras no haya sido consumida." />
          <UFormField label="Producto" required>
            <USelectMenu v-model="reservationForm.product_id" :items="reservableProductOptions" value-key="value" searchable placeholder="Buscar producto con disponibilidad" class="w-full" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Cantidad" required><UInput v-model.number="reservationForm.quantity" type="number" min="0.001" step="any" class="w-full" /></UFormField>
            <UFormField label="Vence el" help="Opcional"><UInput v-model="reservationForm.expires_at" type="datetime-local" class="w-full" /></UFormField>
          </div>
          <UFormField label="Motivo" required help="Indicá para qué cliente, proyecto o situación se compromete.">
            <UTextarea v-model="reservationForm.reason" :rows="3" placeholder="Ej.: reserva preventiva para cliente…" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="showReservationModal = false" />
          <UButton label="Crear reserva" icon="i-lucide-bookmark-plus" :loading="reservationSaving" @click="createReservation" />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="replenishmentOpen"
      :title="replenishmentEditingId ? 'Editar política de reposición' : 'Configurar reposición'"
      description="La política se aplicará al producto dentro de este depósito."
    >
      <template #body>
        <div class="space-y-5">
          <div class="grid gap-3 rounded-lg border border-default bg-elevated/40 p-4 sm:grid-cols-2">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Producto</p>
              <p class="mt-1 font-semibold">{{ replenishmentProduct?.name }}</p>
              <p class="text-xs text-muted">{{ replenishmentProduct?.sku || 'Sin SKU' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Depósito</p>
              <p class="mt-1 font-semibold">{{ warehouse?.name }}</p>
              <p class="text-xs text-muted">{{ warehouse?.code || 'Sin código' }}</p>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Punto de reposición" description="Al llegar a esta cantidad se genera la advertencia.">
              <UInput v-model.number="replenishmentForm.reorder_point" type="number" min="0" step="0.001" class="w-full" />
            </UFormField>
            <UFormField label="Stock objetivo" description="Cantidad que se desea alcanzar después de reponer.">
              <UInput v-model.number="replenishmentForm.target_stock" type="number" min="0" step="0.001" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Plazo de reposición" description="Días utilizados para considerar compras y arribos próximos.">
            <UInput v-model.number="replenishmentForm.lead_time_days" type="number" min="0" step="1" class="w-full">
              <template #trailing>días</template>
            </UInput>
          </UFormField>
          <USwitch v-model="replenishmentForm.active" label="Política activa" />
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="outline" @click="replenishmentOpen = false" />
          <UButton label="Guardar política" icon="i-lucide-save" :loading="replenishmentSaving" @click="saveReplenishmentPolicy" />
        </div>
      </template>
    </UModal>
  </div>
</template>
