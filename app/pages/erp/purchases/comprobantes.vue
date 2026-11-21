<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import DocumentStatusVisibilityPopover from '~/components/erp/documents/DocumentStatusVisibilityPopover.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { useDocumentsTypesService } from '~/modulos/erp/documents/documents-types/services/documents-types.service'
import { createPurchasesColumns } from '~/modulos/erp/purchases/columns'
import { useServerTable } from '~/composables/table/useServerTable'
import {
  CATEGORY_LABELS,
  getCategoryStatuses,
  getDocumentStatusOptions,
  getStatusColor,
  isDocumentCancelled
} from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'
import CreateDocumentMenu from '~/components/erp/documents/CreateDocumentMenu.vue'
import {
  canSettleDocument,
  getDocumentPaymentSummary,
  isDocumentFullyPaid
} from '~/modulos/erp/documents/utils/document-payment-status'
import { canSendDocumentToTrash } from '~/modulos/erp/documents/utils/trash-eligibility'

// ─── Store ──────────────────────────────────────────────────────────────────
const documentsPurchasesStore = useDocumentsPurchasesStore()
const documentsTypesService = useDocumentsTypesService()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { can: canDocument } = useDocumentPermissions()
const { isOwnerOrAdmin } = useCompanyRole()
useDocumentFormPreload('/erp/purchases/purchases-documents/new')

const canSelectForTrash = (row: any) => canSendDocumentToTrash(row)
  && !(Number(row.status) === 2
    && ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(row.document_types?.category ?? '')
    && !canDocument('purchases', row.document_types?.category, 'cancel'))

const PURCHASE_CATEGORIES = ['ORDER', 'REMITO', 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const
const purchaseCategorySet = new Set<string>(PURCHASE_CATEGORIES)
const readablePurchaseCategories = computed(() =>
  PURCHASE_CATEGORIES.filter((category) => canDocument('purchases', category, 'read'))
)
const ALL_FILTER_VALUE = '__ALL__'
const NOTES_FILTER_VALUE = 'NOTES'

// El endpoint también abastece otros circuitos internos con dirección de compra
// (por ejemplo, vales de RRHH y saldos iniciales). Este listado muestra sólo
// comprobantes comerciales de compras.
const documents = computed(() =>
  (documentsPurchasesStore.items ?? []).filter((document) =>
    purchaseCategorySet.has(document.document_types?.category ?? '')
  )
)
const pending = computed(() => documentsPurchasesStore.loading)
const error = computed(() => documentsPurchasesStore.error)

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
const initialCategory = typeof route.query.category === 'string'
  && (route.query.category === NOTES_FILTER_VALUE
    ? readablePurchaseCategories.value.some(category => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category))
    : purchaseCategorySet.has(route.query.category)
      && readablePurchaseCategories.value.includes(route.query.category as typeof PURCHASE_CATEGORIES[number]))
  ? route.query.category
  : undefined
const categoryFilter = ref<string | undefined>(initialCategory)
const singleCategoryFilter = computed(() => categoryFilter.value && categoryFilter.value !== NOTES_FILTER_VALUE ? categoryFilter.value : undefined)
const selectedCategories = computed(() => {
  if (categoryFilter.value === NOTES_FILTER_VALUE) {
    return readablePurchaseCategories.value.filter(category => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category))
  }
  if (categoryFilter.value) return readablePurchaseCategories.value.includes(categoryFilter.value as typeof PURCHASE_CATEGORIES[number]) ? [categoryFilter.value] : []
  return readablePurchaseCategories.value
})
const statusFilter = ref<number | undefined>(undefined)
const selectedCategoryFilter = computed({
  get: () => categoryFilter.value ?? ALL_FILTER_VALUE,
  set: (value: string) => { categoryFilter.value = value === ALL_FILTER_VALUE ? undefined : value }
})
const pageTitle = computed(() => categoryFilter.value === 'INVOICE'
  ? 'Facturas de compra'
  : categoryFilter.value === NOTES_FILTER_VALUE
    ? 'Notas de crédito y débito'
    : 'Comprobantes de compra')
const selectedStatusFilter = computed({
  get: () => statusFilter.value ?? ALL_FILTER_VALUE,
  set: (value: number | string) => { statusFilter.value = value === ALL_FILTER_VALUE ? undefined : Number(value) }
})
const showFullyPaid = ref(false)
const hiddenStatusKeys = ref<string[]>([])
const statusVisibilityGroups = computed(() => PURCHASE_CATEGORIES
  .filter(category => selectedCategories.value.includes(category))
  .map(category => ({
    category,
    direction: -1 as const,
    label: CATEGORY_LABELS[category] ?? category,
    options: getDocumentStatusOptions(category, -1),
  })))
const cancelTarget = ref<any | null>(null)
const cancelModalOpen = ref(false)
const cancelProcessing = ref(false)

const serverTable = useServerTable(
  (query) => documentsPurchasesStore.fetchPage({
    ...query,
    status: statusFilter.value,
    category: singleCategoryFilter.value,
    categories: singleCategoryFilter.value ? undefined : selectedCategories.value.join(','),
    excludeStatuses: hiddenStatusKeys.value.join(',') || undefined,
    excludeOpeningBalances: true
  }),
  'purchases-comprobantes'
)
const { page, pageSize, search, sorting, filters, refresh } = serverTable

watch(hiddenStatusKeys, () => {
  page.value = 1
  void refresh()
}, { deep: true })
watch(filters, (currentFilters) => {
  const selectedKeys = new Set<string>()
  for (const filter of currentFilters) {
    if (filter.column !== 'status') continue
    const value = String(filter.value ?? '')
    const scoped = /^document-status:([A-Z_]+):(\d+)$/.exec(value)
    if (scoped) selectedKeys.add(`${scoped[1]}:${Number(scoped[2])}`)
    else if (singleCategoryFilter.value && /^\d+$/.test(value)) selectedKeys.add(`${singleCategoryFilter.value}:${Number(value)}`)
  }
  if ([...selectedKeys].some(key => hiddenStatusKeys.value.includes(key))) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(key => !selectedKeys.has(key))
  }
}, { deep: true })

watch(readablePurchaseCategories, (allowedCategories) => {
  if (singleCategoryFilter.value && !allowedCategories.includes(singleCategoryFilter.value as typeof PURCHASE_CATEGORIES[number])) {
    categoryFilter.value = undefined
    return
  }
  if (categoryFilter.value === NOTES_FILTER_VALUE && !allowedCategories.some(category => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category))) {
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
  router.replace({ query: { ...route.query, category: categoryFilter.value || undefined } })
})

watch(() => route.query.category, (value) => {
  const nextCategory = typeof value === 'string'
    && (value === NOTES_FILTER_VALUE
      ? readablePurchaseCategories.value.some(category => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category))
      : readablePurchaseCategories.value.includes(value as typeof PURCHASE_CATEGORIES[number]))
    ? value
    : undefined
  if (categoryFilter.value !== nextCategory) categoryFilter.value = nextCategory
})

watch(statusFilter, (status) => {
  const key = singleCategoryFilter.value && status !== undefined ? `${singleCategoryFilter.value}:${status}` : undefined
  if (key && hiddenStatusKeys.value.includes(key)) {
    hiddenStatusKeys.value = hiddenStatusKeys.value.filter(hiddenKey => hiddenKey !== key)
    return
  }
  if (page.value !== 1) page.value = 1
  else void refresh().catch(() => undefined)
})
watch(showFullyPaid, () => { page.value = 1 })

// ─── Filtros de categoría ─────────────────────────────────────────────────────
const categoryOptions = computed(() => [
  { label: 'Todos los comprobantes', value: ALL_FILTER_VALUE },
  ...(readablePurchaseCategories.value.some(category => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category))
    ? [{ label: 'Notas de crédito y débito', value: NOTES_FILTER_VALUE }]
    : []),
  ...PURCHASE_CATEGORIES.filter((cat) => canDocument('purchases', cat, 'read')).map((cat) => ({
    label: CATEGORY_LABELS[cat] ?? cat,
    value: cat
  }))
])

// ─── Filtros de estado (según categoría) ─────────────────────────────────────
const statusOptions = computed(() =>
  singleCategoryFilter.value
    ? getCategoryStatuses(singleCategoryFilter.value, getEnabledStatusesForCategory(singleCategoryFilter.value))
    : []
)

const categoryStatusFilterOptions = computed(() => [
  { label: singleCategoryFilter.value ? 'Todos los estados' : 'Elegí un comprobante', value: ALL_FILTER_VALUE },
  ...statusOptions.value
])

const visibleDocuments = computed(() => {
  let rows = (documents.value ?? []).filter((document) =>
    !hiddenStatusKeys.value.includes(`${document.document_types?.category}:${document.status}`),
  )
  if (!showFullyPaid.value) rows = rows.filter((document) => !isDocumentFullyPaid(document))
  return rows
})

const financialStats = computed(() => {
  const rows = (documents.value ?? []).filter(
    (document) => !isDocumentCancelled(document.document_types?.category, document.status, -1)
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
  if (singleCategoryFilter.value) {
    const statuses = getCategoryStatuses(singleCategoryFilter.value, getEnabledStatusesForCategory(singleCategoryFilter.value))
    return {
      byCategory: [],
      byStatus: statuses.map((s) => {
        const matching = docs.filter((d) => d.status === s.value)
        return {
          label: s.label,
          count: matching.length,
          total: matching.reduce((a, d) => a + Number(d.total), 0),
          color: getStatusColor(singleCategoryFilter.value!, s.value)
        }
      })
    }
  }
  return {
    byCategory: selectedCategories.value.map((cat) => ({
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
  const category = row.document_types?.category
  if (category === 'ORDER') {
    router.push(`/erp/purchases/orders/${row.id}`)
    return
  }
  if (category === 'REMITO') {
    router.push(`/erp/purchases/remitos/${row.id}`)
    return
  }
  router.push(`/erp/purchases/purchases-documents/${row.id}`)
}

function duplicateDocument(row: any) {
  const category = row.document_types?.category
  if (!['ORDER', 'INVOICE'].includes(category) || !canDocument('purchases', category, 'create')) return
  const path = category === 'ORDER' ? '/erp/purchases/orders/new' : '/erp/purchases/purchases-documents/new'
  router.push({ path, query: { category, duplicate_id: row.id } })
}

function editDocument(row: any) {
  const category = row.document_types?.category
  if (category === 'ORDER') {
    router.push(`/erp/purchases/orders/${row.id}/edit`)
    return
  }
  if (category === 'REMITO') {
    router.push(`/erp/purchases/remitos/${row.id}/edit`)
    return
  }
  router.push(`/erp/purchases/purchases-documents/${row.id}/edit`)
}

function canCancelDocument(row: any) {
  const category = row.document_types?.category ?? ''
  const status = Number(row.status)
  const cancellable = status === 0
    || (category === 'ORDER' && status >= 2 && status < 7)
    || (category === 'INVOICE' && [1, 2].includes(status))
    || (['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category) && [1, 2].includes(status))
  return cancellable && canDocument('purchases', category, 'cancel')
}

function openCancelModal(row: any) {
  cancelTarget.value = row
  cancelModalOpen.value = true
}

async function confirmCancelDocument() {
  if (!cancelTarget.value || cancelProcessing.value) return
  cancelProcessing.value = true
  try {
    await documentsPurchasesStore.cancel(cancelTarget.value.id)
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

  if (['ORDER', 'INVOICE'].includes(category) && canDocument('purchases', category, 'create')) {
    groups.push([{
      label: 'Duplicar como borrador',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateDocument(row)
    }])
  }

  const standardActions: any[] = []
  if ([0, 1].includes(status) && canDocument('purchases', category, 'update')) {
    standardActions.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => editDocument(row) })
  }
  if (status === 2 && canSettleDocument(row) && row.party_id) {
    standardActions.push({ label: 'Pagar', icon: 'i-lucide-hand-coins', onSelect: () => payDocument(row) })
  }
  if (category === 'INVOICE' && status === 2) {
    if (canDocument('purchases', 'CREDIT_NOTE', 'create')) {
      standardActions.push({
        label: 'Crear NC',
        icon: 'i-lucide-file-minus',
        onSelect: () => router.push(`/erp/purchases/purchases-documents/new?category=CREDIT_NOTE&parent_document_id=${row.id}`)
      })
    }
    if (canDocument('purchases', 'DEBIT_NOTE', 'create')) {
      standardActions.push({
        label: 'Crear ND',
        icon: 'i-lucide-file-plus',
        onSelect: () => router.push(`/erp/purchases/purchases-documents/new?category=DEBIT_NOTE&parent_document_id=${row.id}`)
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
  const unauthorized = rows.filter((row) => !canDocument('purchases', row.document_types?.category, 'delete'))
  if (unauthorized.length) {
    toast.add({ title: 'No tenés permiso para eliminar uno o más tipos de documento', color: 'warning' })
    return
  }
  const missingCancelPermission = rows.some((row) => Number(row.status) === 2
    && ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(row.document_types?.category ?? '')
    && !canDocument('purchases', row.document_types?.category, 'cancel'))
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
    for (const document of removable) await documentsPurchasesStore.remove(document.id)
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
  createPurchasesColumns({
    onOpen: openDocument,
    onPay: payDocument,
    onDuplicate: duplicateDocument,
    getRowActions: getDocumentRowActions,
    actionsFirst: true,
    canDuplicate: (row) => canDocument('purchases', row.document_types?.category ?? '', 'create'),
    showCreator: isOwnerOrAdmin.value,
    statusFilterOptions: singleCategoryFilter.value
      ? getDocumentStatusOptions(singleCategoryFilter.value, -1, getEnabledStatusesForCategory(singleCategoryFilter.value))
          .map(({ label, value }) => ({ label, value }))
      : null
  })
)

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
    <AppPageHeader :title="pageTitle" description="Gestión de documentos de compra">
      <template #links>
        <CreateDocumentMenu direction="purchases" />
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
              <p class="text-xs leading-4 text-muted">Sin pagos</p>
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
              <p class="text-xs leading-4 text-muted">Pago parcial</p>
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
              <p class="text-xs leading-4 text-muted">Pagados</p>
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
            :disabled="!singleCategoryFilter"
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
          <p class="text-xs text-muted">Ocultalos para concentrarte en los pagos pendientes.</p>
        </div>
        <div class="flex flex-wrap items-center gap-5">
          <span class="text-sm text-muted">Mostrar pagados</span>
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
        :total-rows="documentsPurchasesStore.pagination.total"
        :on-row-click="openDocument"
        :on-delete="deleteDrafts"
        selectable
        :can-select-row="canSelectForTrash"
      />
    </div>
  </UPage>

  <UModal
    v-model:open="cancelModalOpen"
    :title="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(cancelTarget?.document_types?.category ?? '') ? 'Anular nota de crédito/débito' : 'Anular documento'"
    :dismissible="!cancelProcessing"
  >
    <template #body>
      <div v-if="cancelTarget" class="space-y-3">
        <p>¿Anular el documento <strong>#{{ cancelTarget.number }}</strong>?</p>
        <p v-if="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(cancelTarget.document_types?.category ?? '')" class="text-sm text-muted">
          La anulación revierte el efecto de la nota y conserva su relación con la factura. Si tiene pagos activos, primero hay que anularlos.
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
