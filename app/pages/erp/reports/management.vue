<script setup lang="ts">
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type { ManagementReportMetadata, ManagementReportResponse, PaymentState, ProgressState, ReportBasis, ReportGroupBy } from '~/modulos/erp/management-reports/management-reports.types'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn, TableFilter } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import type { SortingState } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { reportTableFilter } from '~/modulos/erp/management-reports/report-table-filter'
import { PAYMENT_METHOD_UNKNOWN_LABEL, paymentDestinationDisplay, paymentDestinationLabel, paymentMethodFilterOptions, paymentMethodLabel } from '~/modulos/erp/management-reports/payment-methods'
import { getCategoryStatuses } from '~/modulos/erp/documents/types/document-statuses'

definePageMeta({ middleware: ['auth', 'management-reports'] })

const service = useManagementReportsService()
const toast = useToast()
const loading = ref(false)
const report = ref<ManagementReportResponse | null>(null)
const metadata = ref<ManagementReportMetadata | null>(null)
type ManagementTableRow = Record<string, any> & { id: string }
const textColumn = (accessorKey: string, label: string): ExtendedColumn<ManagementTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'text', operators: ['contains', 'equals'] } },
})
const numberColumn = (accessorKey: string, label: string): ExtendedColumn<ManagementTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
})
const selectColumn = (accessorKey: string, label: string, options: string[]): ExtendedColumn<ManagementTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'select', options: options.map(value => ({ label: value, value })) } },
})
const quickFilters = (...fields: Array<[string, string]>): FilterField[] => fields.map(([id, label]) => ({ id, label }))
const sortOptions = (...fields: Array<[string, string]>): SortField[] => fields.map(([label, value]) => ({ label, value }))
const ULinkComponent = resolveComponent('ULink')
const UBadgeComponent = resolveComponent('UBadge')
let reloadTimer: ReturnType<typeof setTimeout> | null = null
let requestSequence = 0
const reportDetailSorting = ref<SortingState>([])
const reportDetailFilters = ref<TableFilter[]>([])
/** Columnas del detalle que solo existen cuando la base es Cobros. */
const COLLECTION_ONLY_DETAIL_COLUMNS = ['payment_method_display', 'payment_destination_display']

const currentDate = new Date()
const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const filters = reactive({
  basis: 'INVOICE' as ReportBasis,
  date_from: isoDate(firstDay),
  date_to: isoDate(currentDate),
  group_by: 'MONTH' as ReportGroupBy,
  payment_state: 'ALL' as PaymentState,
  document_status: 'ALL' as number | 'ALL',
  currency_code: 'ALL',
  party_id: 'ALL',
  seller_id: 'ALL',
  product_id: 'ALL',
  point_of_sale_id: 'ALL',
  invoicing_state: 'ALL' as ProgressState,
  delivery_state: 'ALL' as ProgressState,
})
const showAdvancedFilters = ref(false)

const basisOptions = [
  { label: 'Órdenes de venta', shortLabel: 'OV', value: 'SALES_ORDER', icon: 'i-lucide-shopping-cart' },
  { label: 'Presupuestos', shortLabel: 'Presup.', value: 'QUOTE', icon: 'i-lucide-file-text' },
  { label: 'Facturas', shortLabel: 'Facturas', value: 'INVOICE', icon: 'i-lucide-receipt' },
]
const groupOptions = [
  { label: 'Por mes', value: 'MONTH' }, { label: 'Por día', value: 'DAY' },
  { label: 'Por cliente', value: 'PARTY' }, { label: 'Por vendedor', value: 'SELLER' },
  { label: 'Por moneda', value: 'CURRENCY' },
]
const availableGroupOptions = computed(() => filters.basis === 'SALES_ORDER'
  ? groupOptions
  : groupOptions.filter(option => option.value !== 'SELLER'))
const paymentOptions = [
  { label: 'Todos', value: 'ALL' }, { label: 'Sin cobrar', value: 'UNPAID' },
  { label: 'Cobro parcial', value: 'PARTIAL' }, { label: 'Totalmente cobrados', value: 'PAID' },
]
const documentStatusOptions = computed(() => {
  const category = filters.basis === 'SALES_ORDER' ? 'ORDER' : filters.basis === 'QUOTE' ? 'QUOTE' : 'INVOICE'
  return [
    { label: 'Todos los estados', value: 'ALL' as const },
    ...getCategoryStatuses(category).map(({ value, label }) => ({ label, value })),
  ]
})
const currencyOptions = [
  { label: 'Todas las monedas', value: 'ALL' }, { label: 'ARS', value: 'ARS' }, { label: 'USD', value: 'USD' },
]
const progressOptions = [
  { label: 'Todos', value: 'ALL' }, { label: 'Sin iniciar', value: 'NONE' },
  { label: 'Parcial', value: 'PARTIAL' }, { label: 'Completo', value: 'COMPLETE' },
]
const partyOptions = computed(() => [
  { label: 'Todos los clientes', value: 'ALL' },
  ...(metadata.value?.parties.map(item => ({ label: item.tax_id ? `${item.name} · ${item.tax_id}` : item.name, value: item.id })) ?? []),
])
const sellerOptions = computed(() => [
  { label: 'Todos los vendedores', value: 'ALL' },
  ...(metadata.value?.sellers.map(item => ({ label: `${item.first_name} ${item.last_name}`.trim(), value: item.id })) ?? []),
])
const productOptions = computed(() => [
  { label: 'Todos los productos', value: 'ALL' },
  ...(metadata.value?.products.map(item => ({ label: item.sku ? `${item.sku} · ${item.name}` : item.name, value: item.id })) ?? []),
])
const pointOfSaleOptions = computed(() => [
  { label: 'Todos los puntos de venta', value: 'ALL' },
  ...(metadata.value?.points_of_sale.map(item => ({ label: `${item.point_of_sale} · ${item.name}`, value: item.id })) ?? []),
])

const selectedBasis = computed(() => basisOptions.find(item => item.value === filters.basis))
const advancedFiltersCount = computed(() => [
  filters.group_by !== 'MONTH',
  filters.currency_code !== 'ALL',
  filters.party_id !== 'ALL',
  filters.basis === 'SALES_ORDER' && filters.seller_id !== 'ALL',
  filters.basis !== 'COLLECTION' && filters.product_id !== 'ALL',
  filters.basis !== 'COLLECTION' && filters.point_of_sale_id !== 'ALL',
  filters.basis !== 'QUOTE' && filters.basis !== 'COLLECTION' && filters.payment_state !== 'ALL',
  filters.basis === 'SALES_ORDER' && filters.invoicing_state !== 'ALL',
  filters.basis === 'SALES_ORDER' && filters.delivery_state !== 'ALL',
].filter(Boolean).length)
const hasActiveFilters = computed(() => advancedFiltersCount.value > 0 || filters.document_status !== 'ALL')
const salesProductsReportLink = computed(() => ({
  path: '/erp/sales/sales-reports/salesProducts',
  query: { startDate: filters.date_from, endDate: filters.date_to },
}))
const formatCurrency = (value: number, currency = 'ARS') => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(value) || 0)

const sellerColumns: ExtendedColumn<ManagementTableRow>[] = [
  textColumn('name', 'Vendedor'), numberColumn('document_count', 'Documentos'), numberColumn('quantity', 'Unidades'),
  textColumn('revenue_display', 'Venta'), textColumn('paid_display', 'Cobrado'),
]
const reportRowDateColumn = (): ExtendedColumn<ManagementTableRow> => ({
  accessorKey: 'date',
  header: 'Fecha',
  filterFn: reportTableFilter,
  cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString('es-AR'),
  meta: { label: 'Fecha', filter: { type: 'date-range', operators: ['between'] } },
})
const reportRowCurrencyColumn = (accessorKey: string, label: string): ExtendedColumn<ManagementTableRow> => ({
  accessorKey,
  header: label,
  filterFn: reportTableFilter,
  cell: ({ row }: any) => formatCurrency(row.original[accessorKey], row.original.currency_code),
  meta: { label, filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
})
const reportRowPaymentMethodColumn = (): ExtendedColumn<ManagementTableRow> => ({
  ...selectColumn('payment_method_display', 'Medio de pago', paymentMethodFilterOptions),
  cell: ({ row }: any) => h(UBadgeComponent, { label: row.original.payment_method_display, variant: 'subtle' }),
})
const reportRowDestinationColumn = (): ExtendedColumn<ManagementTableRow> => ({
  ...textColumn('payment_destination_display', 'Banco / Caja'),
  cell: ({ row }: any) => {
    const destinations = row.original.payment_destinations ?? []
    if (!destinations.length) return h('span', { class: 'text-muted' }, PAYMENT_METHOD_UNKNOWN_LABEL)
    return h('div', { class: 'flex flex-col gap-0.5' }, destinations.map((destination: any) => h('span', { class: 'truncate' }, [
      paymentDestinationLabel(destination) ?? paymentMethodLabel(destination.method),
      ...(destination.amount != null
        ? [h('span', { class: 'text-muted' }, ` · ${formatCurrency(destination.amount, row.original.currency_code)}`)]
        : []),
    ])))
  },
})
const reportRowColumns = computed<ExtendedColumn<ManagementTableRow>[]>(() => [
  reportRowDateColumn(),
  { ...textColumn('label', 'Documento'), cell: ({ row }: any) => h(ULinkComponent, { to: documentRoute(row.original), class: 'text-primary hover:underline' }, () => row.original.label) },
  textColumn('party_name', 'Cliente'),
  ...(filters.basis !== 'COLLECTION' ? [{
    ...selectColumn('status_label', 'Estado del documento', documentStatusOptions.value.filter(item => item.value !== 'ALL').map(item => item.label)),
    cell: ({ row }: any) => h(UBadgeComponent, { label: row.original.status_label, variant: 'subtle' }),
  }] : []),
  ...(filters.basis === 'COLLECTION' ? [reportRowPaymentMethodColumn(), reportRowDestinationColumn()] : []),
  selectColumn('currency_code', 'Moneda', ['ARS', 'USD']),
  reportRowCurrencyColumn('amount', 'Total'),
  ...(filters.basis === 'QUOTE' ? [] : [
    reportRowCurrencyColumn('paid_amount', 'Cobrado'),
    reportRowCurrencyColumn('pending_amount', 'Pendiente'),
    { ...selectColumn('payment_state_label', 'Estado de cobro', ['Cobrado', 'Parcial', 'Pendiente']), cell: ({ row }: any) => h(UBadgeComponent, { label: row.original.payment_state_label, variant: 'subtle' }) },
  ]),
])
const sellerRows = computed(() => (report.value?.commercial_performance?.sellers ?? []).map((seller, index) => ({
  ...seller,
  id: seller.seller_id ?? `seller-${index}`,
  revenue_display: formatCurrency(seller.revenue),
  paid_display: formatCurrency(seller.paid),
})))
const reportTableRows = computed(() => (report.value?.rows ?? []).map(row => ({
  ...row,
  payment_method_display: paymentMethodLabel(row.payment_method),
  payment_destination_display: paymentDestinationDisplay(row.payment_destinations),
  payment_state_label: row.payment_state === 'PAID' ? 'Cobrado' : row.payment_state === 'PARTIAL' ? 'Parcial' : 'Pendiente',
})))
const reportDetailFilterFields = computed(() => {
  const fields: Array<[string, string]> = [['label', 'Documento'], ['party_name', 'Cliente']]
  if (filters.basis !== 'COLLECTION') fields.push(['status_label', 'Estado del documento'])
  if (filters.basis === 'COLLECTION') fields.push(['payment_method_display', 'Medio de pago'], ['payment_destination_display', 'Banco / Caja'])
  return quickFilters(...fields)
})
const reportDetailSortFields = computed(() => {
  const fields: Array<[string, string]> = [['Fecha', 'date'], ['Total', 'amount'], ['Cobrado', 'paid_amount'], ['Pendiente', 'pending_amount']]
  if (filters.basis === 'COLLECTION') fields.push(['Medio de pago', 'payment_method_display'], ['Banco / Caja', 'payment_destination_display'])
  return sortOptions(...fields)
})

async function loadReport() {
  if (reloadTimer) {
    clearTimeout(reloadTimer)
    reloadTimer = null
  }
  const requestId = ++requestSequence
  try {
    loading.value = true
    const response = await service.getReport({
      ...filters,
      currency_code: filters.currency_code && filters.currency_code !== 'ALL' ? filters.currency_code : undefined,
      payment_state: filters.basis === 'COLLECTION' || filters.basis === 'QUOTE' ? 'ALL' : filters.payment_state,
      document_status: filters.document_status === 'ALL' || filters.basis === 'COLLECTION' ? undefined : filters.document_status,
      party_id: filters.party_id !== 'ALL' ? filters.party_id : undefined,
      seller_id: filters.basis === 'SALES_ORDER' && filters.seller_id !== 'ALL' ? filters.seller_id : undefined,
      product_id: filters.basis !== 'COLLECTION' && filters.product_id !== 'ALL' ? filters.product_id : undefined,
      point_of_sale_id: filters.basis !== 'COLLECTION' && filters.point_of_sale_id !== 'ALL' ? filters.point_of_sale_id : undefined,
      invoicing_state: filters.basis === 'SALES_ORDER' ? filters.invoicing_state : 'ALL',
      delivery_state: filters.basis === 'SALES_ORDER' ? filters.delivery_state : 'ALL',
    })
    if (requestId === requestSequence) report.value = response
  } catch (error: any) {
    if (requestId === requestSequence) {
      toast.add({ title: 'No se pudo generar el reporte', description: error?.data?.message ?? error.message, color: 'error' })
    }
  } finally {
    if (requestId === requestSequence) loading.value = false
  }
}

async function loadMetadata() {
  try {
    metadata.value = await service.getMetadata()
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar los filtros', description: error?.data?.message ?? error.message, color: 'warning' })
  }
}

function documentRoute(row: ManagementReportResponse['rows'][number]) {
  return filters.basis === 'COLLECTION' ? `/erp/treasury/payments/${row.id}` : `/erp/sales/${row.id}`
}

function clearAllFilters() {
  filters.group_by = 'MONTH'
  filters.payment_state = 'ALL'
  filters.currency_code = 'ALL'
  filters.party_id = 'ALL'
  filters.seller_id = 'ALL'
  filters.product_id = 'ALL'
  filters.point_of_sale_id = 'ALL'
  filters.invoicing_state = 'ALL'
  filters.delivery_state = 'ALL'
  filters.document_status = 'ALL'
}

function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(loadReport, 350)
}

watch(() => filters.basis, (basis) => {
  if (basis === 'COLLECTION' || basis === 'QUOTE') filters.payment_state = 'ALL'
  filters.document_status = 'ALL'
  if (basis !== 'SALES_ORDER' && filters.group_by === 'SELLER') filters.group_by = 'MONTH'
  if (basis !== 'SALES_ORDER') {
    filters.seller_id = 'ALL'
    filters.invoicing_state = 'ALL'
    filters.delivery_state = 'ALL'
  }
  // Estas columnas solo existen en Cobros: se limpia su estado al salir de esa base.
  if (basis !== 'COLLECTION') {
    reportDetailSorting.value = reportDetailSorting.value.filter(sort => !COLLECTION_ONLY_DETAIL_COLUMNS.includes(sort.id))
    reportDetailFilters.value = reportDetailFilters.value.filter(filter => !COLLECTION_ONLY_DETAIL_COLUMNS.includes(filter.column))
  }
})

watch(
  () => ({ ...filters }),
  scheduleReload,
  { deep: true, immediate: true }
)

onBeforeUnmount(() => {
  if (reloadTimer) clearTimeout(reloadTimer)
})

onMounted(loadMetadata)
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
    <div class="flex flex-col gap-8">
    <AppPageHeader title="Reporte gerencial" description="Analizá OV, presupuestos o facturas; los cobros se reflejan en la OV o factura asociada">
      <template #links>
        <UButton label="Actualizar reporte" icon="i-lucide-refresh-cw" :loading="loading" @click="loadReport" />
      </template>
    </AppPageHeader>

    <section class="relative overflow-hidden rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
      <div v-if="loading" class="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/15">
        <div class="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Tipo de reporte</p>
          <div role="group" aria-label="Tipo de reporte" class="grid grid-cols-3 gap-1 rounded-xl border border-default bg-default/50 p-1 sm:inline-flex">
            <button
              v-for="option in basisOptions"
              :key="option.value"
              type="button"
              class="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
              :class="filters.basis === option.value ? 'bg-primary text-inverted shadow-sm' : 'text-muted hover:bg-elevated hover:text-default'"
              :aria-label="option.label"
              :aria-pressed="filters.basis === option.value"
              @click="filters.basis = option.value as ReportBasis"
            >
              <UIcon :name="option.icon" class="size-4 shrink-0" />
              <span class="truncate sm:hidden">{{ option.shortLabel }}</span>
              <span class="hidden truncate sm:inline">{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(210px,1.25fr)_auto]">
          <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" class="w-full" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" class="w-full" /></UFormField>
          <UFormField v-if="filters.basis !== 'COLLECTION'" label="Estado del documento"><USelect v-model="filters.document_status" :items="documentStatusOptions" value-key="value" class="w-full" /></UFormField>
          <div class="flex items-center justify-start gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end">
            <UButton
              :icon="showAdvancedFilters ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
              color="neutral"
              variant="outline"
              :aria-expanded="showAdvancedFilters"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <span>{{ showAdvancedFilters ? 'Menos filtros' : 'Más filtros' }}</span>
              <UBadge v-if="advancedFiltersCount" :label="String(advancedFiltersCount)" color="primary" variant="subtle" size="xs" />
            </UButton>
            <UButton
              v-if="hasActiveFilters"
              label="Limpiar"
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              @click="clearAllFilters"
            />
          </div>
        </div>

        <div v-if="showAdvancedFilters" class="flex flex-col gap-4 border-t border-default pt-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <UFormField label="Agrupar"><USelect v-model="filters.group_by" :items="availableGroupOptions" class="w-full" /></UFormField>
            <UFormField v-if="filters.basis !== 'COLLECTION' && filters.basis !== 'QUOTE'" label="Estado de cobro"><USelect v-model="filters.payment_state" :items="paymentOptions" class="w-full" /></UFormField>
            <UFormField label="Moneda"><USelect v-model="filters.currency_code" :items="currencyOptions" class="w-full" /></UFormField>
          </div>
          <div class="border-t border-default pt-4">
            <p class="mb-3 text-sm font-medium">Filtros comerciales</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <UFormField label="Cliente">
                <USelectMenu v-model="filters.party_id" :items="partyOptions" value-key="value" searchable placeholder="Todos los clientes" class="w-full" />
              </UFormField>
              <UFormField v-if="filters.basis === 'SALES_ORDER'" label="Vendedor">
                <USelectMenu v-model="filters.seller_id" :items="sellerOptions" value-key="value" searchable placeholder="Todos los vendedores" class="w-full" />
              </UFormField>
              <UFormField v-if="filters.basis !== 'COLLECTION'" label="Producto">
                <USelectMenu v-model="filters.product_id" :items="productOptions" value-key="value" searchable placeholder="Todos los productos" class="w-full" />
              </UFormField>
              <UFormField v-if="filters.basis !== 'COLLECTION'" label="Punto de venta">
                <USelectMenu v-model="filters.point_of_sale_id" :items="pointOfSaleOptions" value-key="value" searchable placeholder="Todos los puntos de venta" class="w-full" />
              </UFormField>
              <UFormField v-if="filters.basis === 'SALES_ORDER'" label="Facturación de la OV">
                <USelect v-model="filters.invoicing_state" :items="progressOptions" class="w-full" />
              </UFormField>
              <UFormField v-if="filters.basis === 'SALES_ORDER'" label="Entrega de la OV">
                <USelect v-model="filters.delivery_state" :items="progressOptions" class="w-full" />
              </UFormField>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!report && loading" class="flex flex-col gap-6" aria-label="Generando reporte">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
      </div>
    </div>

    <div
      v-if="report"
      class="relative flex flex-col gap-6 transition duration-200"
      :class="loading ? 'pointer-events-none opacity-55' : 'opacity-100'"
      :aria-busy="loading"
    >
      <div v-if="loading" class="absolute inset-0 z-10 flex items-start justify-center pt-20">
        <div class="flex items-center gap-2 rounded-full border border-default bg-default/95 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin text-primary" />
          Actualizando reporte
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2" :class="filters.basis === 'QUOTE' ? 'xl:grid-cols-2' : 'xl:grid-cols-4'">
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">{{ selectedBasis?.label }}</p><p class="mt-2 text-2xl font-bold">{{ formatCurrency(report.summary.converted_total) }}</p><p class="text-xs text-muted">{{ report.summary.count }} documentos</p></UPageCard>
        <UPageCard v-if="filters.basis !== 'QUOTE'" variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Cobrado</p><p class="mt-2 text-2xl font-bold text-success">{{ formatCurrency(report.summary.converted_paid) }}</p></UPageCard>
        <UPageCard v-if="filters.basis !== 'QUOTE'" variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Pendiente</p><p class="mt-2 text-2xl font-bold text-warning">{{ formatCurrency(report.summary.converted_pending) }}</p></UPageCard>
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Monedas</p><div class="mt-2 space-y-1"><p v-for="(values, currency) in report.summary.by_currency" :key="currency" class="flex justify-between text-sm"><span>{{ currency }}</span><strong>{{ formatCurrency(values.total, currency) }}</strong></p></div></UPageCard>
      </div>

      <UAlert v-if="report.summary.missing_exchange_rate_count" color="warning" icon="i-lucide-triangle-alert" title="Consolidado incompleto" :description="`${report.summary.missing_exchange_rate_count} movimientos no tienen cotización histórica.`" />

      <div v-if="report.commercial_performance && filters.basis !== 'QUOTE'" class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-lg font-semibold">Rendimiento comercial</p>
            <p class="text-sm text-muted">Consultá las ventas por vendedor o abrí el reporte de productos para analizar artículos.</p>
          </div>
          <UButton
            label="Ver reporte de productos"
            icon="i-lucide-chart-no-axes-combined"
            color="neutral"
            variant="outline"
            size="sm"
            :to="salesProductsReportLink"
          />
        </div>
        <UPageCard v-if="report.commercial_performance.sellers.length" variant="subtle" class="overflow-hidden">
          <template #header>
            <div><p class="font-semibold">Desempeño por vendedor</p><p class="text-xs text-muted">Ventas, cobros y unidades por vendedor en el período seleccionado</p></div>
          </template>
          <AsteriskTable
            compact
            storage-key="management-report-sellers"
            :data="sellerRows"
            :columns="sellerColumns"
            :filter-fields="quickFilters(['name', 'Vendedor'])"
            :sort-fields="sortOptions(['Vendedor', 'name'], ['Venta', 'revenue_display'], ['Cobrado', 'paid_display'])"
            search-placeholder="Buscar vendedor..."
          />
        </UPageCard>
      </div>

      <UPageCard variant="subtle" class="overflow-hidden">
        <template #header><div><p class="font-semibold">Detalle del reporte</p><p class="text-xs text-muted">Primeros 200 resultados de la base seleccionada</p></div></template>
        <AsteriskTable
          v-model:sorting="reportDetailSorting"
          v-model:filters="reportDetailFilters"
          compact
          storage-key="management-report-detail"
          :data="reportTableRows"
          :columns="reportRowColumns"
          :filter-fields="reportDetailFilterFields"
          :sort-fields="reportDetailSortFields"
          search-placeholder="Buscar documento o cliente..."
        />
      </UPageCard>
    </div>
    </div>
  </UPage>
</template>
