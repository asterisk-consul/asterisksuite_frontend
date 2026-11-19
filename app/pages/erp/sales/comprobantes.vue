<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import DocumentStatusVisibilityPopover from '~/components/erp/documents/DocumentStatusVisibilityPopover.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useDocumentsTypesService } from '~/modulos/erp/documents/documents-types/services/documents-types.service'
import { createSalesColumns } from '~/modulos/erp/sales/columns'
import GenerateFromTripsModal from '~/components/sales/GenerateFromTripsModal.vue'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import { useServerTable } from '~/composables/table/useServerTable'
import {
  CATEGORY_LABELS,
  getCategoryStatuses,
  getStatusColor,
  isDocumentCancelled
} from '~/modulos/erp/documents/types/document-statuses'
import { getOrderFlowPresentation } from '~/modulos/erp/documents/orden-venta/order-flow-status'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import {
  canSettleDocument,
  getDocumentPaymentSummary,
  isDocumentFullyPaid
} from '~/modulos/erp/documents/utils/document-payment-status'
import { canSendDocumentToTrash } from '~/modulos/erp/documents/utils/trash-eligibility'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsSalesStore = useDocumentsSalesStore()
const documentsTypesService = useDocumentsTypesService()
const router = useRouter()
const toast = useToast()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/sales/new?category=INVOICE')

const canSelectForTrash = (row: any) => canSendDocumentToTrash(row)
  && !(Number(row.status) === 2
    && ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(row.document_types?.category ?? '')
    && !canDocument('sales', row.document_types?.category, 'cancel'))

const SALES_CATEGORIES = ['QUOTE', 'ORDER', 'REMITO', 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const
const statusCategoryLabels: Record<string, string> = {
  QUOTE: 'Presupuesto',
  ORDER: 'Orden de venta',
  REMITO: 'Remito',
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de crédito',
  DEBIT_NOTE: 'Nota de débito'
}
const readableSalesCategories = computed(() =>
  SALES_CATEGORIES.filter((category) => canDocument('sales', category, 'read'))
)
const ALL_FILTER_VALUE = '__ALL__'
const documents = computed(() => documentsSalesStore.items)
const pending = computed(() => documentsSalesStore.loading)
const error = computed(() => documentsSalesStore.error)

// ─── Tipos de documento (para enabled_statuses) ─────────────────────────────
const docTypes = ref<any[]>([])
onMounted(async () => {
  try {
    docTypes.value = await documentsTypesService.findAll()
  } catch {
    /* ignore */
  }
})

const getEnabledStatusesForCategory = (category: string): number[] | null => {
  const types = docTypes.value.filter((dt) => dt.category === category)
  if (types.length === 0) return null
  const allEnabled = types.flatMap((dt) => dt.enabled_statuses ?? [])
  return allEnabled.length > 0 ? [...new Set(allEnabled)] : null
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
const route = useRoute()
const initialCategory = typeof route.query.category === 'string'
  && readableSalesCategories.value.includes(route.query.category as typeof SALES_CATEGORIES[number])
  ? route.query.category
  : undefined
const categoryFilter = ref<string | undefined>(initialCategory)
const statusFilter = ref<number | string | undefined>(undefined)
const selectedCategoryFilter = computed({
  get: () => categoryFilter.value ?? ALL_FILTER_VALUE,
  set: (value: string) => { categoryFilter.value = value === ALL_FILTER_VALUE ? undefined : value }
})
const selectedStatusFilter = computed({
  get: () => statusFilter.value ?? ALL_FILTER_VALUE,
  set: (value: number | string) => { statusFilter.value = value === ALL_FILTER_VALUE ? undefined : value }
})
const showFullyPaid = ref(false)
const hiddenStatusKeys = ref<string[]>([])
const statusVisibilityGroups = computed(() => SALES_CATEGORIES
  .filter(category => canDocument('sales', category, 'read') && (!categoryFilter.value || categoryFilter.value === category))
  .map(category => ({
    category,
    direction: 1 as const,
    label: statusCategoryLabels[category] ?? CATEGORY_LABELS[category] ?? category,
    options: getCategoryStatuses(category),
  })))
const generateResult = ref<{ total_trips: number; results: any[] } | null>(null)
const showGenerateModal = ref(false)
const cancelTarget = ref<any | null>(null)
const cancelModalOpen = ref(false)
const cancelProcessing = ref(false)

const serverTable = useServerTable(
  (query) => {
    const deliveryStatus = typeof statusFilter.value === 'string'
      ? statusFilter.value.replace('order-flow:', '') as 'PENDING' | 'ELIGIBLE' | 'DRAFT_CREATED'
      : undefined
    return documentsSalesStore.fetchPage({
      ...query,
      status: typeof statusFilter.value === 'number' ? statusFilter.value : undefined,
      deliveryStatus,
      category: categoryFilter.value && readableSalesCategories.value.includes(categoryFilter.value as typeof SALES_CATEGORIES[number])
        ? categoryFilter.value
        : undefined,
      categories: categoryFilter.value ? undefined : readableSalesCategories.value.join(','),
      excludeStatuses: hiddenStatusKeys.value.join(',') || undefined,
      excludeOpeningBalances: true
    })
  },
  'sales-comprobantes'
)
const { page, pageSize, search, sorting, filters, refresh } = serverTable

watch(hiddenStatusKeys, () => {
  page.value = 1
  void refresh()
}, { deep: true })
watch(filters, (currentFilters) => {
  const selectedKeys = new Set<string>()
  let hasOrderFlowFilter = false
  for (const filter of currentFilters) {
    if (filter.column !== 'status') continue
    const value = String(filter.value ?? '')
    const scoped = /^document-status:([A-Z_]+):(.+)$/.exec(value)
    const scopedCategory = scoped?.[1]
    const scopedStatus = scoped?.[2]
    if (scopedCategory && scopedStatus && /^\d+$/.test(scopedStatus)) selectedKeys.add(`${scopedCategory}:${Number(scopedStatus)}`)
    else if (scopedCategory === 'ORDER' && scopedStatus?.startsWith('order-flow:')) hasOrderFlowFilter = true
    else if (categoryFilter.value && /^\d+$/.test(value)) selectedKeys.add(`${categoryFilter.value}:${Number(value)}`)
  }
  if (hasOrderFlowFilter) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !key.startsWith('ORDER:'))
    return
  }
  if ([...selectedKeys].some(key => hiddenStatusKeys.value.includes(key))) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !selectedKeys.has(key))
  }
}, { deep: true })

watch(readableSalesCategories, (allowedCategories) => {
  if (categoryFilter.value && !allowedCategories.includes(categoryFilter.value as typeof SALES_CATEGORIES[number])) {
    categoryFilter.value = undefined
    return
  }
  if (!categoryFilter.value) {
    if (page.value !== 1) page.value = 1
    else void refresh().catch(() => undefined)
  }
})

watch(categoryFilter, () => {
  statusFilter.value = undefined
  if (page.value !== 1) page.value = 1
  else void refresh().catch(() => undefined)
  // Persistir la categoría en la URL (deep-link desde el dashboard)
  router.replace({ query: { ...route.query, category: categoryFilter.value || undefined } })
})

watch(statusFilter, (status) => {
  let key: string | undefined
  if (typeof status === 'number' && categoryFilter.value) key = `${categoryFilter.value}:${status}`
  else if (typeof status === 'string') {
    const match = /^document-status:([A-Z_]+):(\d+)$/.exec(status)
    if (match) key = `${match[1]}:${Number(match[2])}`
  }
  if (key && hiddenStatusKeys.value.includes(key)) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(hiddenKey => hiddenKey !== key)
    return
  }
  if (page.value !== 1) page.value = 1
  else void refresh().catch(() => undefined)
})
watch(showFullyPaid, () => { page.value = 1 })

// ─── Filtros de categoría ─────────────────────────────────────────────────────
const categoryOptions = computed(() => {
  const docs = documents.value ?? []
  const counts = new Map<string, number>()
  for (const d of docs) {
    const cat = d.document_types?.category ?? ''
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  return [
    { label: 'Todos los comprobantes', value: ALL_FILTER_VALUE },
    ...SALES_CATEGORIES.filter((cat) => canDocument('sales', cat, 'read')).map((cat) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      value: cat
    }))
  ]
})

const categoryStatusFilterOptions = computed(() => [
  { label: categoryFilter.value ? 'Todos los estados' : 'Elegí un comprobante', value: ALL_FILTER_VALUE },
  ...(categoryFilter.value ? getStatusOptionsForCategory(categoryFilter.value) : [])
])

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

// ─── Filtros de estado (según categoría) ─────────────────────────────────────
type StatusOption = { label: string; value: number | string }

function getStatusOptionsForCategory(category: string): StatusOption[] {
  const configured = getCategoryStatuses(category, getEnabledStatusesForCategory(category))
  if (category !== 'ORDER') return configured
  const documentStates = configured.filter((option) => option.value !== 2 && option.value !== 3)
  const beforePreparation = documentStates.filter((option) => typeof option.value === 'number' && option.value < 2)
  const afterPreparation = documentStates.filter((option) => typeof option.value === 'number' && option.value > 3)

  // Estos estados son operativos y pueden aparecer aunque el tipo de OV tenga
  // una configuración personalizada de estados documentales.
  return [
    ...beforePreparation,
    { label: 'En preparación', value: 'order-flow:PENDING' },
    { label: 'Lista para despacho', value: 'order-flow:ELIGIBLE' },
    { label: 'Remito pendiente', value: 'order-flow:DRAFT_CREATED' },
    ...afterPreparation
  ]
}

const statusOptions = computed<StatusOption[]>(() => {
  if (categoryFilter.value) return getStatusOptionsForCategory(categoryFilter.value)

  return SALES_CATEGORIES
    .filter((category) => canDocument('sales', category, 'read'))
    .flatMap((category) => getStatusOptionsForCategory(category).map((option) => ({
      label: `${statusCategoryLabels[category] ?? CATEGORY_LABELS[category] ?? category} · ${option.label}`,
      value: `document-status:${category}:${option.value}`
    })))
})

function matchesStatusOption(document: any, option: StatusOption) {
  if (typeof option.value === 'number') return Number(document.status) === option.value
  return getOrderFlowPresentation(document)?.label === option.label
}

const visibleDocuments = computed(() => {
  let rows = (documents.value ?? []).filter((document) =>
    !hiddenStatusKeys.value.includes(`${document.document_types?.category}:${document.status}`),
  )
  if (!showFullyPaid.value) rows = rows.filter((document) => !isDocumentFullyPaid(document))
  return rows
})

const financialStats = computed(() => {
  const rows = (documents.value ?? []).filter(
    (document) => !isDocumentCancelled(document.document_types?.category, document.status)
  )
  const summaries = rows.map(getDocumentPaymentSummary).filter((summary) => summary.applies)
  return {
    visible: visibleDocuments.value.length,
    pending: summaries.filter((summary) => summary.state === 'UNPAID').length,
    partial: summaries.filter((summary) => summary.state === 'PARTIAL').length,
    paid: summaries.filter((summary) => summary.state === 'PAID').length
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
        const matching = docs.filter((d) => matchesStatusOption(d, s))
        const flowValue = String(s.value ?? '')
        return {
          label: s.label,
          count: matching.length,
          total: matching.reduce((a, d) => a + Number(d.total), 0),
          color: typeof s.value === 'number'
            ? getStatusColor(categoryFilter.value, s.value)
            : flowValue.endsWith('PENDING')
              ? 'warning'
              : flowValue.endsWith('ELIGIBLE')
                ? 'primary'
                : 'info'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function openDocument(row: any) {
  router.push(`/erp/sales/${row.id}`)
}

function duplicateDocument(row: any) {
  const category = row.document_types?.category
  if (!['ORDER', 'INVOICE'].includes(category) || !canDocument('sales', category, 'create')) return
  router.push({ path: '/erp/sales/new', query: { category, duplicate_id: row.id } })
}

function editDocument(row: any) {
  router.push(`/erp/sales/${row.id}/edit`)
}

function canCancelDocument(row: any) {
  const category = row.document_types?.category ?? ''
  const status = Number(row.status)
  const cancellable = status === 0
    || (category === 'ORDER' && status >= 2 && status < 7)
    || (category === 'INVOICE' && [1, 2].includes(status))
    || (['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category) && [1, 2].includes(status))
  return cancellable && canDocument('sales', category, 'cancel')
}

function openCancelModal(row: any) {
  cancelTarget.value = row
  cancelModalOpen.value = true
}

async function confirmCancelDocument() {
  if (!cancelTarget.value || cancelProcessing.value) return
  cancelProcessing.value = true
  try {
    await documentsSalesStore.cancel(cancelTarget.value.id)
    await refresh()
    toast.add({ title: 'Documento anulado', color: 'success' })
    cancelModalOpen.value = false
    cancelTarget.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo anular el documento',
      description: error?.data?.message || error?.message || 'Revisá los pagos y efectos operativos asociados.',
      color: 'error'
    })
  } finally {
    cancelProcessing.value = false
  }
}

function getDocumentRowActions(row: any) {
  const category = row.document_types?.category ?? ''
  const status = Number(row.status)
  const groups: any[][] = []

  if (['ORDER', 'INVOICE'].includes(category) && canDocument('sales', category, 'create')) {
    groups.push([{
      label: 'Duplicar como borrador',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateDocument(row)
    }])
  }

  const standardActions: any[] = []
  if ([0, 1].includes(status) && canDocument('sales', category, 'update')) {
    standardActions.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => editDocument(row) })
  }
  if (status === 2 && canSettleDocument(row) && row.party_id) {
    standardActions.push({ label: 'Registrar cobro', icon: 'i-lucide-hand-coins', onSelect: () => collectDocument(row) })
  }
  if (category === 'INVOICE' && status === 2) {
    if (canDocument('sales', 'CREDIT_NOTE', 'create')) {
      standardActions.push({
        label: 'Crear NC',
        icon: 'i-lucide-file-minus',
        onSelect: () => router.push(`/erp/sales/new?category=CREDIT_NOTE&parent_document_id=${row.id}`)
      })
    }
    if (canDocument('sales', 'DEBIT_NOTE', 'create')) {
      standardActions.push({
        label: 'Crear ND',
        icon: 'i-lucide-file-plus',
        onSelect: () => router.push(`/erp/sales/new?category=DEBIT_NOTE&parent_document_id=${row.id}`)
      })
    }
  }
  if (canCancelDocument(row)) {
    standardActions.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onSelect: () => openCancelModal(row) })
  }
  if (standardActions.length) groups.push(standardActions)
  groups.push([{ label: 'Abrir documento', icon: 'i-lucide-arrow-up-right', onSelect: () => openDocument(row) }])
  return groups
}

function collectDocument(row: any) {
  if (!canSettleDocument(row) || !row.party_id) {
    openDocument(row)
    return
  }
  router.push({
    path: '/erp/treasury/payments/create',
    query: {
      type: 'COLLECTION',
      party_id: row.party_id,
      document_id: row.id
    }
  })
}

async function onGenerateSaved() {
  await refresh()
}

async function deleteDrafts(rows: any[]) {
  const unauthorized = rows.filter((row) => !canDocument('sales', row.document_types?.category, 'delete'))
  if (unauthorized.length) {
    toast.add({ title: 'No tenés permiso para eliminar uno o más tipos de documento', color: 'warning' })
    return
  }
  const missingCancelPermission = rows.some((row) => Number(row.status) === 2
    && ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(row.document_types?.category ?? '')
    && !canDocument('sales', row.document_types?.category, 'cancel'))
  if (missingCancelPermission) {
    toast.add({ title: 'También necesitás permiso para anular las NC/ND confirmadas', color: 'warning' })
    return
  }
  const removable = rows.filter(canSendDocumentToTrash)
  if (removable.length !== rows.length) {
    toast.add({ title: 'Hay comprobantes con relaciones o movimientos que impiden enviarlos a la papelera', color: 'warning' })
    return
  }
  try {
    for (const document of removable) await documentsSalesStore.remove(document.id)
    toast.add({
      title: `${removable.length} documento${removable.length === 1 ? '' : 's'} enviado${removable.length === 1 ? '' : 's'} a la papelera`,
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'No se pudieron enviar los documentos a la papelera',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
    await refresh()
  }
}

// ─── Columnas ─────────────────────────────────────────────────────────────────
const columns = computed(() =>
  createSalesColumns({
    onOpen: openDocument,
    onCollect: collectDocument,
    onDuplicate: duplicateDocument,
    getRowActions: getDocumentRowActions,
    actionsFirst: true,
    canDuplicate: (row) => canDocument('sales', row.document_types?.category ?? '', 'create'),
    showCreator: isOwnerOrAdmin.value,
    showSeller: categoryFilter.value === 'ORDER',
    statusFilterOptions: statusOptions.value.length
      ? statusOptions.value.map(({ label, value }) => ({ label, value }))
      : null
  })
)

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
        <CreateDocumentMenu direction="sales" />
        <UButton icon="i-lucide-file-plus" label="Generar desde viajes" @click="() => { showGenerateModal = true }" />
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-5">
      <!-- Resultado de generación -->
      <UAlert
        v-if="generateResult"
        color="success"
        variant="subtle"
        icon="i-lucide-check-circle"
        :title="`Generados: ${generateResult.results.reduce((a, r) => a + r.created, 0)} — Existentes: ${generateResult.results.reduce((a, r) => a + r.skipped, 0)}`"
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
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="flex items-center gap-2">
            <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-files" class="size-4" /></div>
            <div>
              <p class="text-xs leading-4 text-muted">Documentos visibles</p>
              <p class="text-xl font-semibold leading-6">{{ financialStats.visible }}</p>
            </div>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="flex items-center gap-2">
            <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-error/10 text-error">
              <UIcon name="i-lucide-circle-dollar-sign" class="size-4" />
            </div>
            <div>
              <p class="text-xs leading-4 text-muted">Sin cobros</p>
              <p class="text-xl font-semibold leading-6 text-error">{{ financialStats.pending }}</p>
            </div>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="flex items-center gap-2">
            <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
              <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-4" />
            </div>
            <div>
              <p class="text-xs leading-4 text-muted">Cobro parcial</p>
              <p class="text-xl font-semibold leading-6 text-warning">{{ financialStats.partial }}</p>
            </div>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'gap-0 p-2.5 sm:p-2.5' }">
          <div class="flex items-center gap-2">
            <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
              <UIcon name="i-lucide-circle-check" class="size-4" />
            </div>
            <div>
              <p class="text-xs leading-4 text-muted">Cobrados</p>
              <p class="text-xl font-semibold leading-6 text-success">{{ financialStats.paid }}</p>
            </div>
          </div>
        </UPageCard>
      </div>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <UFormField label="Tipo de documento" class="min-w-0">
          <USelect
            v-model="selectedCategoryFilter"
            :items="categoryOptions"
            value-key="value"
            class="w-full min-w-0"
            aria-label="Filtrar por tipo de comprobante"
          />
        </UFormField>
        <UFormField label="Estado" class="min-w-0">
          <USelect
            v-model="selectedStatusFilter"
            :items="categoryStatusFilterOptions"
            value-key="value"
            :disabled="!categoryFilter"
            class="w-full min-w-0"
            aria-label="Filtrar por estado"
          />
        </UFormField>
      </div>

      <div
        class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-medium">Visibilidad de documentos saldados</p>
          <p class="text-xs text-muted">Ocultalos para concentrarte en los cobros pendientes.</p>
        </div>
        <div class="flex flex-wrap items-center gap-5">
          <span class="text-sm text-muted">Mostrar cobrados</span>
          <USwitch v-model="showFullyPaid" />
          <DocumentStatusVisibilityPopover v-model:hidden-status-keys="hiddenStatusKeys" :groups="statusVisibilityGroups" />
        </div>
      </div>

      <!-- Tabla -->
      <LogisticaTable
        v-model:page="page"
        v-model:search="search"
        v-model:filters="filters"
        v-model:sorting="sorting"
        :data="visibleDocuments"
        :columns="columns"
        :loading="pending"
        :filter-fields="filterFields"
        :sort-fields="sortFields"
        server-side
        :page-size="pageSize"
        :total-rows="documentsSalesStore.pagination.total"
        :on-row-click="openDocument"
        :on-delete="deleteDrafts"
        selectable
        :can-select-row="canSelectForTrash"
      />
    </div>
  </UPage>

  <GenerateFromTripsModal v-model="showGenerateModal" @saved="onGenerateSaved" />

  <UModal
    v-model:open="cancelModalOpen"
    :title="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(cancelTarget?.document_types?.category ?? '') ? 'Anular nota de crédito/débito' : 'Anular documento'"
    :dismissible="!cancelProcessing"
  >
    <template #body>
      <div v-if="cancelTarget" class="space-y-3">
        <p>¿Anular el documento <strong>#{{ cancelTarget.number }}</strong>?</p>
        <p v-if="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(cancelTarget.document_types?.category ?? '')" class="text-sm text-muted">
          La anulación revierte el efecto de la nota y conserva su relación con la factura. Si tiene cobros activos, primero hay que anularlos.
        </p>
        <p v-else class="text-sm text-muted">
          Se aplicarán las validaciones de pagos y efectos operativos asociados antes de anularlo.
        </p>
      </div>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" :disabled="cancelProcessing" @click="cancelModalOpen = false" />
        <UButton label="Anular" color="error" :loading="cancelProcessing" @click="confirmCancelDocument" />
      </div>
    </template>
  </UModal>
</template>
