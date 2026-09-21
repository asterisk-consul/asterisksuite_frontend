<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import GenerateFromTripsModal from '~/components/sales/GenerateFromTripsModal.vue'
import { CATEGORY_LABELS, getCategoryStatuses, getStatusColor } from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import { getDocumentPaymentSummary, isDocumentFullyPaid } from '~/modulos/erp/documents/utils/document-payment-status'

// â”€â”€â”€ Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const documentsSalesStore = useDocumentsSalesStore()
const router = useRouter()
const toast = useToast()
const { can: canDocument } = useDocumentPermissions()

const documents = computed(() => documentsSalesStore.items)
const pending = computed(() => documentsSalesStore.loading)
const error = computed(() => documentsSalesStore.error)

// â”€â”€â”€ Tipos de documento (para enabled_statuses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const categoryFilter = ref<string | undefined>(undefined)
const statusFilter = ref<number | undefined>(undefined)
const showFullyPaid = ref(true)
const generateResult = ref<{ total_trips: number; results: any[] } | null>(null)
const showGenerateModal = ref(false)

const refresh = () =>
  documentsSalesStore.fetchAll({
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

// â”€â”€â”€ Filtros de categoría â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SALES_CATEGORIES = ['QUOTE', 'ORDER', 'REMITO', 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const

const categoryOptions = computed(() => {
  const docs = documents.value ?? []
  const counts = new Map<string, number>()
  for (const d of docs) {
    const cat = d.document_types?.category ?? ''
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  return [
    { label: 'Todos', value: undefined },
    ...SALES_CATEGORIES.filter(cat => canDocument('sales', cat, 'read')).map((cat) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      value: cat
    }))
  ]
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

// â”€â”€â”€ Filtros de estado (según categoría) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const statusOptions = computed(() =>
  categoryFilter.value
    ? getCategoryStatuses(categoryFilter.value, getEnabledStatusesForCategory(categoryFilter.value))
    : []
)

const visibleDocuments = computed(() => {
  const rows = documents.value ?? []
  return showFullyPaid.value ? rows : rows.filter(document => !isDocumentFullyPaid(document))
})

const financialStats = computed(() => {
  const rows = documents.value ?? []
  const summaries = rows.map(getDocumentPaymentSummary).filter(summary => summary.applies)
  return {
    visible: visibleDocuments.value.length,
    pending: summaries.filter(summary => summary.state === 'UNPAID').length,
    partial: summaries.filter(summary => summary.state === 'PARTIAL').length,
    paid: summaries.filter(summary => summary.state === 'PAID').length
  }
})

// â”€â”€â”€ Estadísticas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    byCategory: SALES_CATEGORIES.map((cat) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      count: docs.filter((d) => d.document_types?.category === cat).length
    })),
    byStatus: []
  }
})

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// â”€â”€â”€ Acciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDocument(row: any) {
  router.push(`/erp/sales/${row.id}`)
}

async function onGenerateSaved() {
  await refresh()
}

async function deleteDrafts(rows: any[]) {
  const unauthorized = rows.filter(row => !canDocument('sales', row.document_types?.category, 'delete'))
  if (unauthorized.length) {
    toast.add({ title: 'No tenés permiso para eliminar uno o más tipos de documento', color: 'warning' })
    return
  }
  const drafts = rows.filter(row => row.status === 0)
  if (drafts.length !== rows.length) {
    toast.add({ title: 'Solo se pueden eliminar documentos en borrador', color: 'warning' })
    return
  }
  try {
    for (const document of drafts) await documentsSalesStore.remove(document.id)
    toast.add({ title: `${drafts.length} borrador${drafts.length === 1 ? '' : 'es'} eliminado${drafts.length === 1 ? '' : 's'}`, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudieron eliminar todos los borradores', description: e?.data?.message || e?.message, color: 'error' })
    await refresh()
  }
}

// â”€â”€â”€ Columnas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const columns = createSalesColumns({ onOpen: openDocument })

const filterFields = [
  { id: 'number', label: 'Buscar por N°...' },
  { id: 'client', label: 'Buscar por cliente...' },
  { id: 'descrip', label: 'Buscar por descripción...' }
]

const sortFields = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Cliente', value: 'client' },
  { label: 'Total', value: 'total' }
]

</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Comprobantes de venta" description="Gestión de documentos de venta">
      <template #links>
        <UButton
          v-if="canDocument('sales', 'INVOICE', 'create')"
          label="Crear Factura"
          icon="i-lucide-file-plus"
          color="primary"
          @click="navigateTo('/erp/sales/new?category=INVOICE')"
        />
        <UButton
          icon="i-lucide-file-plus"
          label="Generar desde viajes"
          @click="showGenerateModal = true"
        />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <!-- Resultado de generación -->
      <UAlert
        v-if="generateResult"
        color="success"
        variant="subtle"
        icon="i-lucide-check-circle"
        :title="`Generados: ${generateResult.results.reduce((a, r) => a + r.created, 0)} â€” Existentes: ${generateResult.results.reduce((a, r) => a + r.skipped, 0)}`"
        closable
        @close="generateResult = null"
      />

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
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-error/10 p-2 text-error"><UIcon name="i-lucide-circle-dollar-sign" class="size-5" /></div><div><p class="text-xs text-muted">Sin cobros</p><p class="text-2xl font-semibold text-error">{{ financialStats.pending }}</p></div></div></UPageCard>
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-warning/10 p-2 text-warning"><UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-5" /></div><div><p class="text-xs text-muted">Cobro parcial</p><p class="text-2xl font-semibold text-warning">{{ financialStats.partial }}</p></div></div></UPageCard>
        <UPageCard variant="subtle"><div class="flex items-center gap-3"><div class="rounded-lg bg-success/10 p-2 text-success"><UIcon name="i-lucide-circle-check" class="size-5" /></div><div><p class="text-xs text-muted">Cobrados</p><p class="text-2xl font-semibold text-success">{{ financialStats.paid }}</p></div></div></UPageCard>
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
          <p class="text-xs text-muted">Ocultalos para concentrarte en los cobros pendientes.</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">Mostrar cobrados</span>
          <USwitch v-model="showFullyPaid" />
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
        :can-select-row="row => row.status === 0"
        delete-permanently
      />
    </div>
  </UPage>

  <GenerateFromTripsModal
    v-model="showGenerateModal"
    @saved="onGenerateSaved"
  />
</template>
