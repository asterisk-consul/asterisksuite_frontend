<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { useDataTransferPermissions } from '~/modulos/access-control/composables/useDataTransferPermissions'
import { useSalesReportsService } from '~/modulos/erp/sales-reports/service/sales-reports.service'
import type { PointOfSaleDocument, PointOfSaleDocumentItem, PointOfSaleReport, SalesReportDocumentType, SummaryFilters } from '~/modulos/erp/sales-reports/types/sales-reports.types'
import { getStatusColor, getStatusLabel } from '~/modulos/erp/documents/types/document-statuses'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const service = useSalesReportsService()
const { canExport } = useDataTransferPermissions()
const today = new Date()
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const filters = reactive<SummaryFilters>({
  startDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  endDate: localDate(today),
  documentTypeFilter: 'ORDER',
})
const documentTypeOptions: Array<{ label: string; value: SalesReportDocumentType }> = [
  { label: 'Órdenes de venta (OV)', value: 'ORDER' },
  { label: 'Facturas de venta', value: 'INVOICE' },
  { label: 'Notas de crédito', value: 'CREDIT_NOTE' },
  { label: 'Notas de débito', value: 'DEBIT_NOTE' },
  { label: 'Presupuestos', value: 'QUOTE' },
  { label: 'Remitos', value: 'REMITO' },
]
const typeLabel = computed(() => documentTypeOptions.find(option => option.value === filters.documentTypeFilter)?.label ?? 'Documentos')
const search = ref('')
const report = ref<Awaited<ReturnType<typeof service.byPointOfSale>> | null>(null)
const loading = ref(false)
const error = ref('')
const expandedRows = ref<Record<string, boolean>>({})
const activeSummaryId = ref<string | null>(null)
const detail = ref<Awaited<ReturnType<typeof service.byPointOfSaleDocuments>> | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const detailPage = ref(1)
const expandedDocumentRows = ref<Record<string, boolean>>({})
const pageSize = 25

interface SummaryTableRow extends PointOfSaleReport { id: string }
const summaryRows = computed<SummaryTableRow[]>(() => (report.value?.data ?? [])
  .map(row => ({ ...row, id: `${row.point_of_sale}:${row.currency_code}` }))
  .filter(row => row.point_of_sale.toLowerCase().includes(search.value.trim().toLowerCase())))
const expandedOptions = { getRowCanExpand: () => true }
const documentExpandedOptions = { getRowCanExpand: (row: any) => row.original.items.length > 0 }

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}`
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeZone: 'UTC' }).format(date)
}

function documentPath(document: PointOfSaleDocument) {
  const id = encodeURIComponent(document.id)
  if (document.category === 'ORDER') return `/erp/orders/${id}`
  if (document.category === 'QUOTE') return `/erp/budgets/${id}`
  if (document.category === 'REMITO') return `/erp/remitos/${id}`
  return `/erp/sales/${id}`
}

async function fetchData() {
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    error.value = 'La fecha Desde debe ser anterior o igual a Hasta.'
    return
  }
  loading.value = true
  error.value = ''
  report.value = null
  expandedRows.value = {}
  activeSummaryId.value = null
  detail.value = null
  try {
    report.value = await service.byPointOfSale({ ...filters })
  } catch (cause: any) {
    error.value = cause?.data?.message ?? cause?.message ?? 'No se pudo generar el reporte.'
  } finally {
    loading.value = false
  }
}

async function loadDetails(row: SummaryTableRow, page = 1) {
  activeSummaryId.value = row.id
  detailPage.value = page
  detailLoading.value = true
  detailError.value = ''
  expandedDocumentRows.value = {}
  try {
    detail.value = await service.byPointOfSaleDocuments({
      ...filters,
      pointOfSale: row.point_of_sale,
      currencyCode: row.currency_code,
      page,
      pageSize,
    })
  } catch (cause: any) {
    detail.value = null
    detailError.value = cause?.data?.message ?? cause?.message ?? 'No se pudieron cargar los documentos.'
  } finally {
    detailLoading.value = false
  }
}

async function toggleDetails(row: SummaryTableRow) {
  if (activeSummaryId.value === row.id && expandedRows.value[row.id]) {
    expandedRows.value = { ...expandedRows.value, [row.id]: false }
    activeSummaryId.value = null
    detail.value = null
    return
  }
  expandedRows.value = { [row.id]: true }
  await loadDetails(row)
}

function routeForType(document: PointOfSaleDocument) {
  return documentPath(document)
}

function downloadCsv() {
  if (!report.value) return
  const headers = ['Punto de venta', 'Moneda', 'Tipo', 'Cantidad de documentos', 'Importe total']
  const rows = summaryRows.value.map(row => [
    row.point_of_sale,
    row.currency_code,
    typeLabel.value,
    row.count,
    row.total,
  ])
  const csv = [headers, ...rows]
    .map(values => values.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ventas-punto-de-venta-${filters.documentTypeFilter?.toLowerCase() ?? 'documentos'}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

const summaryColumns: ExtendedColumn<SummaryTableRow>[] = [
  { accessorKey: 'point_of_sale', header: 'Punto de venta', meta: { label: 'Punto de venta', filter: false }, cell: ({ row }) => h('span', { class: 'font-mono font-semibold text-highlighted' }, `PV ${row.original.point_of_sale}`) },
  { accessorKey: 'currency_code', header: 'Moneda', meta: { label: 'Moneda', filter: false }, cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'subtle', label: row.original.currency_code }) },
  { accessorKey: 'count', header: 'Documentos', meta: { label: 'Documentos', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, row.original.count.toLocaleString('es-AR')) },
  { accessorKey: 'total', header: 'Importe total', meta: { label: 'Importe total', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right font-semibold tabular-nums text-highlighted' }, formatCurrency(row.original.total, row.original.currency_code)) },
  {
    id: 'type_breakdown',
    header: 'Tipo incluido',
    meta: { label: 'Tipo incluido', filter: false },
    cell: ({ row }) => h('div', { class: 'flex flex-wrap justify-end gap-1' }, row.original.byDocumentType.map(type =>
      h(UBadge, { key: type.code, color: 'primary', variant: 'subtle', size: 'xs', label: `${type.code} · ${type.count} · ${formatCurrency(type.total, row.original.currency_code)}` }),
    )),
  },
  {
    id: 'actions',
    header: '',
    meta: { label: 'Acción', filter: false, disableColumnVisibility: true },
    cell: ({ row }) => h(UButton, {
      label: activeSummaryId.value === row.original.id && expandedRows.value[row.original.id] ? 'Ocultar' : 'Ver documentos',
      icon: activeSummaryId.value === row.original.id && expandedRows.value[row.original.id] ? 'i-lucide-chevron-up' : 'i-lucide-files',
      size: 'xs',
      color: 'primary',
      variant: activeSummaryId.value === row.original.id && expandedRows.value[row.original.id] ? 'soft' : 'ghost',
      'data-row-action': '',
      onClick: (event: Event) => { event.stopPropagation(); void toggleDetails(row.original) },
    }),
  },
]

const documentColumns: ExtendedColumn<PointOfSaleDocument>[] = [
  {
    accessorKey: 'reference',
    header: 'Documento',
    meta: { label: 'Documento', filter: false },
    cell: ({ row }) => h(UButton, { label: `${row.original.type_code} ${row.original.reference}`, to: routeForType(row.original), variant: 'link', color: 'primary', size: 'xs', class: 'h-auto px-0 py-0 font-semibold underline decoration-dotted underline-offset-4' }),
  },
  { accessorKey: 'date', header: 'Fecha', meta: { label: 'Fecha', filter: false }, cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'party_name', header: 'Cliente', meta: { label: 'Cliente', filter: false }, cell: ({ row }) => h('span', { class: 'block max-w-48 truncate' }, row.original.party_name) },
  { accessorKey: 'total_quantity', header: 'Unidades', meta: { label: 'Unidades', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, row.original.total_quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 })) },
  { accessorKey: 'total', header: 'Importe', meta: { label: 'Importe', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right font-medium tabular-nums' }, formatCurrency(row.original.total, row.original.currency_code)) },
  { accessorKey: 'status', header: 'Estado', meta: { label: 'Estado', filter: false }, cell: ({ row }) => h(UBadge, { label: getStatusLabel(row.original.category, row.original.status), color: getStatusColor(row.original.category, row.original.status), variant: 'subtle', size: 'xs' }) },
]

const itemColumns: ExtendedColumn<PointOfSaleDocumentItem>[] = [
  { accessorKey: 'product_name', header: 'Artículo', meta: { label: 'Artículo', filter: false }, cell: ({ row }) => h('div', { class: 'py-0.5' }, [h('span', { class: 'font-medium' }, row.original.product_name), row.original.variant_name ? h('span', { class: 'ml-1 text-xs text-muted' }, row.original.variant_name) : null]) },
  { accessorKey: 'quantity', header: 'Cantidad', meta: { label: 'Cantidad', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, row.original.quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 })) },
  { accessorKey: 'total', header: 'Importe del renglón', meta: { label: 'Importe del renglón', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, formatCurrency(row.original.total, detail.value?.currency_code ?? 'ARS')) },
]

onMounted(fetchData)
</script>

<template>
  <UDashboardPanel id="ventas-pv-report" :ui="{ body: 'overflow-y-auto' }">
    <template #body>
      <UPage class="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-6">
        <div class="flex min-w-0 flex-col gap-4">
          <AppPageHeader title="Ventas por punto de venta" description="Analizá documentos e importes por punto de venta.">
            <template #links>
              <UBadge color="primary" variant="subtle" size="sm">Ventas de la empresa activa</UBadge>
              <UButton v-if="canExport('sales.reports.export')" label="Exportar CSV" icon="i-lucide-download" color="neutral" variant="outline" size="sm" :disabled="!report" @click="downloadCsv" />
            </template>
          </AppPageHeader>
          <section class="rounded-xl border border-default bg-elevated/20 p-3 sm:p-4">
            <div class="sales-point-filter-grid">
              <UFormField label="Desde" size="sm"><UInput v-model="filters.startDate" type="date" size="sm" class="w-full" /></UFormField>
              <UFormField label="Hasta" size="sm"><UInput v-model="filters.endDate" type="date" size="sm" class="w-full" /></UFormField>
              <UFormField label="Tipo de documento" size="sm"><USelectMenu v-model="filters.documentTypeFilter" :items="documentTypeOptions" value-key="value" size="sm" class="w-full" /></UFormField>
              <UButton label="Aplicar filtros" icon="i-lucide-list-filter" size="sm" class="justify-center whitespace-nowrap" :loading="loading" @click="fetchData" />
            </div>
            <p v-if="error" class="mt-3 text-sm text-error">{{ error }}</p>
            <div class="mt-2 flex items-start gap-2 text-xs text-muted"><UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-primary" /><p>El total corresponde a los documentos, no a los cobros, e incluye todos sus estados. OV, remitos y facturas se analizan por separado para evitar duplicar el circuito.</p></div>
          </section>

          <section class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div class="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-default border-l-2 border-l-primary bg-primary/5 px-3 py-2"><div class="min-w-0"><p class="truncate text-xs font-medium text-primary">{{ typeLabel }}</p><p class="text-[11px] text-muted">documentos</p></div><p class="shrink-0 text-2xl font-semibold leading-none tabular-nums text-highlighted">{{ (report?.totalDocuments ?? 0).toLocaleString('es-AR') }}</p></div>
            <div class="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-default border-l-2 border-l-info bg-info/5 px-3 py-2"><div class="min-w-0"><p class="text-xs font-medium text-info">Puntos de venta</p><p class="text-[11px] text-muted">con actividad</p></div><p class="shrink-0 text-2xl font-semibold leading-none tabular-nums text-highlighted">{{ (report?.totalPV ?? 0).toLocaleString('es-AR') }}</p></div>
            <div class="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-default border-l-2 border-l-success bg-success/5 px-3 py-2"><div class="min-w-0"><p class="text-xs font-medium text-success">Importe total</p><p class="text-[11px] text-muted">por moneda</p></div><div v-if="report?.totalsByCurrency.length" class="flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-0.5"><p v-for="total in report.totalsByCurrency" :key="total.currency_code" class="text-right text-lg font-semibold leading-tight tabular-nums text-highlighted">{{ formatCurrency(total.total, total.currency_code) }}</p></div><p v-else class="text-lg font-semibold text-muted">—</p></div>
          </section>

          <section class="min-w-0 rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
            <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="font-semibold text-highlighted">Desglose por punto de venta</h2><p class="mt-1 text-xs text-muted">Expandí un PV para ver los documentos y sus unidades. Los renglones del documento se abren por separado.</p></div><UInput v-model="search" icon="i-lucide-search" placeholder="Buscar punto de venta" class="w-full sm:w-64" /></div>
            <div v-if="loading" class="space-y-2"><USkeleton v-for="i in 5" :key="i" class="h-10 rounded-md" /></div>
            <div v-else-if="!summaryRows.length" class="rounded-lg border border-dashed border-default px-4 py-12 text-center"><UIcon name="i-lucide-receipt-text" class="mx-auto size-8 text-muted" /><p class="mt-3 font-medium text-highlighted">No hay documentos para estos filtros</p><p class="mt-1 text-sm text-muted">Probá con otro período o tipo de documento.</p></div>
            <div v-else class="min-w-0 overflow-x-auto">
              <AsteriskTable v-model:expanded="expandedRows" compact hide-toolbar storage-key="sales-by-point-of-sale-summary" :data="summaryRows" :columns="summaryColumns" :expanded-options="expandedOptions" :get-row-id="(row: SummaryTableRow) => row.id" :table-min-width="900">
                <template #expanded="{ row }">
                  <div v-if="activeSummaryId === row.original.id" class="space-y-3 border-t border-default bg-muted/20 px-3 py-3 sm:px-4">
                    <div class="flex flex-wrap items-center justify-between gap-2"><div><p class="font-medium text-highlighted">Documentos del PV {{ row.original.point_of_sale }}</p><p class="text-xs text-muted">{{ detail?.total ?? 0 }} documentos · {{ typeLabel }} · {{ row.original.currency_code }}</p></div><UBadge color="neutral" variant="subtle">{{ detail?.totalPages ?? 0 }} páginas</UBadge></div>
                    <UAlert v-if="detailError" color="error" variant="soft" :description="detailError" />
                    <div v-if="detailLoading" class="space-y-2"><USkeleton class="h-8 w-full" /><USkeleton class="h-8 w-full" /></div>
                    <div v-else-if="detail?.documents.length" class="min-w-0 overflow-x-auto rounded-md border border-default bg-default/40">
                      <AsteriskTable v-model:expanded="expandedDocumentRows" compact hide-toolbar hide-footer :storage-key="`sales-pv-documents-${row.original.id}`" :data="detail.documents" :columns="documentColumns" :expanded-options="documentExpandedOptions" :get-row-id="(document: PointOfSaleDocument) => document.id" :table-min-width="900">
                        <template #expanded="{ row: documentRow }">
                          <div class="border-t border-default bg-muted/20 px-3 py-2"><p class="mb-1.5 text-xs font-medium text-muted">Artículos y cantidades · {{ documentRow.original.reference }}</p><AsteriskTable compact hide-toolbar hide-footer :storage-key="`sales-pv-items-${documentRow.original.id}`" :data="documentRow.original.items" :columns="itemColumns" :get-row-id="(item: PointOfSaleDocumentItem) => item.id" :table-min-width="500" /></div>
                        </template>
                      </AsteriskTable>
                      <div class="flex justify-end border-t border-default px-3 py-2"><UPagination :page="detailPage" :items-per-page="pageSize" :total="detail.total" size="xs" @update:page="(page) => loadDetails(row.original, page)" /></div>
                    </div>
                    <div v-else-if="!detailLoading" class="rounded-md border border-dashed border-default px-3 py-5 text-center text-sm text-muted">No hay documentos en este punto de venta.</div>
                  </div>
                </template>
              </AsteriskTable>
            </div>
          </section>
        </div>
      </UPage>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.sales-point-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .sales-point-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .sales-point-filter-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
