<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { createPurchasesColumns } from '~/modulos/erp/purchases/columns'
import { CATEGORY_LABELS, getCategoryStatuses, getStatusColor, isDocumentCancelled } from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import { canSettleDocument, getDocumentPaymentSummary, isDocumentFullyPaid } from '~/modulos/erp/documents/utils/document-payment-status'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsPurchasesStore = useDocumentsPurchasesStore()
const router = useRouter()
const toast = useToast()
const { can: canDocument } = useDocumentPermissions()

const PURCHASE_CATEGORIES = ['ORDER', 'REMITO', 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const
const purchaseCategorySet = new Set<string>(PURCHASE_CATEGORIES)

// El endpoint también abastece otros circuitos internos con dirección de compra
// (por ejemplo, vales de RRHH y saldos iniciales). Este listado muestra sólo
// comprobantes comerciales de compras.
const documents = computed(() =>
  (documentsPurchasesStore.items ?? []).filter(document =>
    purchaseCategorySet.has(document.document_types?.category ?? '')
  )
)
const pending = computed(() => documentsPurchasesStore.loading)
const error = computed(() => documentsPurchasesStore.error)

// ─── Tipos de documento (para enabled_statuses) ─────────────────────────────
const docTypes = ref<any[]>([])
onMounted(async () => {
  try {
    docTypes.value = await $fetch<any[]>('/api/backend/documents/documents-types')
  } catch { /* ignore */ }
})

const getEnabledStatusesForCategory = (category: string): number[] | null => {
  const types = docTypes.value.filter(dt => dt.category === category)
  if (types.length === 0) return null
  const allEnabled = types.flatMap(dt => dt.enabled_statuses ?? [])
  return allEnabled.length > 0 ? [...new Set(allEnabled)] : null
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
const categoryFilter = ref<string | undefined>(undefined)
const statusFilter = ref<number | undefined>(undefined)
const showFullyPaid = ref(true)
const showCancelled = ref(false)

const refresh = () =>
  documentsPurchasesStore.fetchAll({
    status: statusFilter.value,
    category: categoryFilter.value
  })

onMounted(async () => {
  await refresh()
})

watch(categoryFilter, () => {
  statusFilter.value = undefined
  refresh()
})

watch(statusFilter, () => refresh())

// ─── Filtros de categoría ─────────────────────────────────────────────────────
const categoryOptions = computed(() => [
  { label: 'Todos', value: undefined },
  ...PURCHASE_CATEGORIES.filter(cat => canDocument('purchases', cat, 'read')).map((cat) => ({
    label: CATEGORY_LABELS[cat] ?? cat,
    value: cat
  }))
])

// ─── Filtros de estado (según categoría) ─────────────────────────────────────
const statusOptions = computed(() =>
  categoryFilter.value
    ? getCategoryStatuses(categoryFilter.value, getEnabledStatusesForCategory(categoryFilter.value))
    : []
)

const visibleDocuments = computed(() => {
  let rows = documents.value ?? []
  if (!showCancelled.value) rows = rows.filter(document => !isDocumentCancelled(document.document_types?.category, document.status))
  if (!showFullyPaid.value) rows = rows.filter(document => !isDocumentFullyPaid(document))
  return rows
})

const financialStats = computed(() => {
  const rows = (documents.value ?? []).filter(document =>
    !isDocumentCancelled(document.document_types?.category, document.status)
  )
  const summaries = rows.map(getDocumentPaymentSummary).filter(summary => summary.applies)
  return {
    visible: visibleDocuments.value.length,
    pending: summaries.filter(summary => summary.state === 'UNPAID').length,
    partial: summaries.filter(summary => summary.state === 'PARTIAL').length,
    paid: summaries.filter(summary => summary.state === 'PAID').length
  }
})

// ─── Estadísticas ─────────────────────────────────────────────────────────────
const stats = computed(() => {
  const docs = documents.value ?? []
  if (categoryFilter.value) {
    const statuses = getCategoryStatuses(categoryFilter.value, getEnabledStatusesForCategory(categoryFilter.value))
    return {
      byCategory: [],
      byStatus: statuses.map((s) => {
        const matching = docs.filter((d) => d.status === s.value)
        return {
          label: s.label,
          count: matching.length,
          total: matching.reduce((a, d) => a + Number(d.total), 0),
          color: getStatusColor(categoryFilter.value, s.value)
        }
      })
    }
  }
  return {
    byCategory: PURCHASE_CATEGORIES.map((cat) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      count: docs.filter((d) => d.document_types?.category === cat).length
    })),
    byStatus: []
  }
})

const STATUS_TEXT_CLASSES: Record<string, string> = {
  primary: 'text-primary-500',
  neutral: 'text-muted',
  secondary: 'text-secondary-500',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  error: 'text-error-500'
}

const statusTextClass = (color: string) => STATUS_TEXT_CLASSES[color] ?? 'text-muted'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function openDocument(row: any) {
  router.push(`/erp/purchases/purchases-documents/${row.id}`)
}

function payDocument(row: any) {
  if (!canSettleDocument(row) || !row.party_id) {
    openDocument(row)
    return
  }

  router.push({
    path: '/erp/treasury/payments/create',
    query: {
      type: 'PAYMENT',
      party_id: row.party_id,
      document_id: row.id
    }
  })
}

async function deleteDrafts(rows: any[]) {
  const unauthorized = rows.filter(row => !canDocument('purchases', row.document_types?.category, 'delete'))
  if (unauthorized.length) {
    toast.add({ title: 'No tenés permiso para eliminar uno o más tipos de documento', color: 'warning' })
    return
  }
  const removable = rows.filter(row => row.status === 0 || (row.document_types?.category === 'INVOICE' && row.status === 3))
  if (removable.length !== rows.length) {
    toast.add({ title: 'Solo se pueden enviar a la papelera documentos en borrador o anulados', color: 'warning' })
    return
  }
  try {
    for (const document of removable) await documentsPurchasesStore.remove(document.id)
    toast.add({ title: `${removable.length} documento${removable.length === 1 ? '' : 's'} enviado${removable.length === 1 ? '' : 's'} a la papelera`, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudieron enviar los documentos a la papelera', description: e?.data?.message || e?.message, color: 'error' })
    await refresh()
  }
}

// ─── Columnas ─────────────────────────────────────────────────────────────────
const columns = createPurchasesColumns({ onOpen: openDocument, onPay: payDocument })

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'supplier', label: 'Buscar por proveedor...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Proveedor', value: 'supplier' },
  { label: 'Total', value: 'total' }
]

</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Comprobantes de compra" description="Gestión de documentos de compra">
      <template #links>
        <UButton
          v-if="canDocument('purchases', 'INVOICE', 'create')"
          icon="i-lucide-plus"
          label="Nueva factura"
          to="/erp/purchases/purchases-documents/new"
        />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Error al cargar documentos"
      />

      <!-- Resumen operativo -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-files" class="size-5" /></div><div><p class="text-xs text-muted">Documentos visibles</p><p class="text-2xl font-semibold">{{ financialStats.visible }}</p></div></div></UPageCard>
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-error/10 p-2 text-error"><UIcon name="i-lucide-circle-dollar-sign" class="size-5" /></div><div><p class="text-xs text-muted">Sin pagos</p><p class="text-2xl font-semibold text-error">{{ financialStats.pending }}</p></div></div></UPageCard>
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-warning/10 p-2 text-warning"><UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-5" /></div><div><p class="text-xs text-muted">Pago parcial</p><p class="text-2xl font-semibold text-warning">{{ financialStats.partial }}</p></div></div></UPageCard>
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-success/10 p-2 text-success"><UIcon name="i-lucide-circle-check" class="size-5" /></div><div><p class="text-xs text-muted">Pagados</p><p class="text-2xl font-semibold text-success">{{ financialStats.paid }}</p></div></div></UPageCard>
      </div>

      <!-- Filtro por categoría -->
      <div class="flex gap-2 flex-wrap">
        <UButton
          v-for="opt in categoryOptions"
          :key="opt.label"
          :variant="categoryFilter === opt.value ? 'solid' : 'ghost'"
          color="primary"
          size="sm"
          :label="opt.label"
          @click="() => { categoryFilter = opt.value }"
        />
      </div>

      <!-- Filtro por estado (solo con categoría seleccionada) -->
      <div v-if="categoryFilter" class="flex gap-2 flex-wrap">
        <UButton
          :variant="statusFilter === undefined ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          label="Todos los estados"
          @click="() => { statusFilter = undefined }"
        />
        <UButton
          v-for="opt in statusOptions"
          :key="opt.value"
          :variant="statusFilter === opt.value ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          :label="opt.label"
          @click="() => { statusFilter = opt.value }"
        />
      </div>

      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium">Visibilidad de documentos saldados</p>
          <p class="text-xs text-muted">Ocultalos para concentrarte en los pagos pendientes.</p>
        </div>
        <div class="flex flex-wrap items-center gap-5">
          <span class="text-sm text-muted">Mostrar pagados</span>
          <USwitch v-model="showFullyPaid" />
          <span class="text-sm text-muted">Mostrar anulados</span>
          <USwitch v-model="showCancelled" />
        </div>
      </div>

      <!-- Tabla -->
      <LogisticaTable
        :data="visibleDocuments"
        :columns="columns"
        :loading="pending"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
        :on-delete="deleteDrafts"
        selectable
        :can-select-row="row => row.status === 0 || (row.document_types?.category === 'INVOICE' && row.status === 3)"
      />
    </div>
  </UPage>
</template>
