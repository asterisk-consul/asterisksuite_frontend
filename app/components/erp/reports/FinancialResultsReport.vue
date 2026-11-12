<script setup lang="ts">
import { h, nextTick } from 'vue'
import { UBadge, UButton } from '#components'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type {
  FinancialResultsCompositionRow,
  FinancialResultsCounts,
  FinancialResultsDetail,
  FinancialResultsDetailRow,
  FinancialResultsDocumentItems,
  FinancialResultsMetric,
  FinancialResultsMetrics,
  FinancialResultsSummary,
} from '~/modulos/erp/management-reports/financial-results.types'
import { getStatusLabel } from '~/modulos/erp/documents/types/document-statuses'

interface SummaryRow {
  id: string
  company_id: string | null
  company_name: string
  currency_code: string
  metrics: FinancialResultsMetrics
  counts: FinancialResultsCounts
  is_total: boolean
}

interface ActiveDetail {
  company_id: string
  company_name: string
  metric: FinancialResultsMetric
}

const service = useManagementReportsService()
const toast = useToast()
const today = new Date()
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const filters = reactive({
  date_from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  date_to: localDate(today),
})
const companies = ref<Awaited<ReturnType<typeof service.getConsolidatedCompanies>>>([])
const selectedCompanyIds = ref<string[]>([])
const ovStatusOptions = [
  { value: 1, label: 'Aprobada' }, { value: 2, label: 'En preparación' },
  { value: 3, label: 'Lista para despacho' }, { value: 4, label: 'Entrega parcial' },
  { value: 5, label: 'Entregada' }, { value: 6, label: 'Facturada' },
  { value: 7, label: 'Cerrada' },
]
const selectedOvStatuses = ref<number[]>(ovStatusOptions.map(status => status.value))
const draftOvStatuses = ref<number[]>([...selectedOvStatuses.value])
const summary = ref<FinancialResultsSummary | null>(null)
const currencyFilter = ref('ALL')
const loadingCompanies = ref(false)
const loadingSummary = ref(false)
const summaryError = ref('')
const activeDetail = ref<ActiveDetail | null>(null)
const detailSection = ref<HTMLElement | null>(null)
const detailCurrency = ref('ARS')
const detailAccountKey = ref<string | null>(null)
const detailSearch = ref('')
const detailPaymentState = ref<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL')
const detailPage = ref(1)
const detail = ref<FinancialResultsDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const expandedRows = ref<Record<string, boolean>>({})
const expandedItems = ref<Record<string, FinancialResultsDocumentItems>>({})
const expandedLoading = ref<Record<string, boolean>>({})
const pageSize = 25

const metricLabels: Record<FinancialResultsMetric, string> = {
  sales_confirmed: 'Ventas · OV aprobadas',
  purchase_invoices: 'Compras / gastos facturados',
  sales_invoices: 'Facturas de venta',
  payments: 'Pagos realizados',
  collections: 'Cobros realizados',
  pending_orders: 'Saldo de OV por cobrar',
}
const metricIcons: Record<FinancialResultsMetric, string> = {
  sales_confirmed: 'i-lucide-trending-up',
  purchase_invoices: 'i-lucide-file-text',
  sales_invoices: 'i-lucide-receipt',
  payments: 'i-lucide-credit-card',
  collections: 'i-lucide-hand-coins',
  pending_orders: 'i-lucide-hourglass',
}
const drillMetrics: FinancialResultsMetric[] = [
  'sales_confirmed', 'purchase_invoices', 'sales_invoices', 'payments', 'collections', 'pending_orders',
]
const companyOptions = computed(() => companies.value.map(company => ({
  label: `${company.name} · ${company.subdomain}`,
  value: company.id,
})))
const allSelectableSelected = computed(() => companies.value.length > 0 && selectedCompanyIds.value.length === Math.min(companies.value.length, 20))
const atCompanyLimit = computed(() => selectedCompanyIds.value.length >= 20)
const canGenerate = computed(() => selectedCompanyIds.value.length > 0 && selectedOvStatuses.value.length > 0 && filters.date_from <= filters.date_to)
const draftOvStatusSelectionLabel = computed(() => draftOvStatuses.value.length === ovStatusOptions.length
  ? 'Todos los estados activos'
  : draftOvStatuses.value.length ? `${draftOvStatuses.value.length} de ${ovStatusOptions.length} estados` : 'Elegir estados')
const ovStatusesChanged = computed(() => [...draftOvStatuses.value].sort((a, b) => a - b).join(',') !== selectedOvStatuses.value.join(','))
const currencyOptions = computed(() => {
  const currencies = new Set<string>()
  for (const company of summary.value?.companies ?? []) {
    for (const metric of Object.values(company.metrics)) {
      for (const currency of Object.keys(metric)) currencies.add(currency)
    }
  }
  return [
    { label: 'Todas las monedas', value: 'ALL' },
    ...[...currencies].sort().map(currency => ({ label: currency, value: currency })),
  ]
})
const summaryRows = computed<SummaryRow[]>(() => {
  if (!summary.value) return []
  const makeRows = (name: string, companyId: string | null, metrics: FinancialResultsMetrics, counts: FinancialResultsCounts, isTotal: boolean) => {
    const currencies = new Set(Object.values(metrics).flatMap(values => Object.keys(values)))
    if (!currencies.size) currencies.add(currencyFilter.value === 'ALL' ? 'ARS' : currencyFilter.value)
    const selectedCurrencies = currencyFilter.value === 'ALL'
      ? [...currencies]
      : [currencyFilter.value]
    return selectedCurrencies.map(currency => ({
      id: `${companyId ?? 'total'}:${currency}`,
      company_id: companyId,
      company_name: name,
      currency_code: currency,
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, values]) => [key, { ...values, [currency]: values[currency] ?? '0' }])) as FinancialResultsMetrics,
      counts: Object.fromEntries(Object.entries(counts).map(([key, values]) => [key, { ...values, [currency]: values[currency] ?? 0 }])) as FinancialResultsCounts,
      is_total: isTotal,
    }))
  }
  const companyRows = summary.value.companies.flatMap(company =>
    makeRows(company.company_name, company.company_id, company.metrics, company.counts, false),
  )
  const totalRows = makeRows('Total de la selección', null, summary.value.totals.metrics, summary.value.totals.counts, true)
  return [...companyRows, ...totalRows]
})
const currentCurrencyOptions = computed(() => {
  const currencies = [...new Set((detail.value?.composition ?? []).map(row => row.currency_code))].sort()
  if (!currencies.includes(detailCurrency.value)) currencies.unshift(detailCurrency.value)
  return currencies.map(currency => ({ label: currency, value: currency }))
})
const visibleComposition = computed(() => (detail.value?.composition ?? [])
  .filter(row => row.currency_code === detailCurrency.value))
const selectedComposition = computed(() => visibleComposition.value.find(row => row.key === detailAccountKey.value) ?? null)
const selectedCompanyCountLabel = computed(() => `${selectedCompanyIds.value.length} de ${companies.value.length} empresas`)

function toggleCompany(id: string, checked: boolean | 'indeterminate') {
  if (checked === true && !selectedCompanyIds.value.includes(id) && atCompanyLimit.value) {
    toast.add({ title: 'Límite de empresas', description: 'Podés consultar hasta 20 empresas por reporte.', color: 'warning' })
    return
  }
  selectedCompanyIds.value = checked === true
    ? [...new Set([...selectedCompanyIds.value, id])]
    : selectedCompanyIds.value.filter(item => item !== id)
  clearLoadedResults()
}

async function applyOvStatuses() {
  if (!draftOvStatuses.value.length || loadingSummary.value) return
  const previousCurrency = currencyFilter.value
  const previousStatuses = [...selectedOvStatuses.value]
  selectedOvStatuses.value = [...draftOvStatuses.value].sort((a, b) => a - b)
  const updated = await generateSummary()
  if (!updated) {
    selectedOvStatuses.value = previousStatuses
    draftOvStatuses.value = previousStatuses
    return
  }
  if (currencyOptions.value.some(option => option.value === previousCurrency)) {
    currencyFilter.value = previousCurrency
  }
}

function selectAllDraftOvStatuses() {
  draftOvStatuses.value = ovStatusOptions.map(status => status.value)
}

function toggleAllCompanies() {
  selectedCompanyIds.value = allSelectableSelected.value
    ? []
    : companies.value.slice(0, 20).map(company => company.id)
  if (!allSelectableSelected.value && companies.value.length > 20) {
    toast.add({ title: 'Límite de empresas', description: 'Se seleccionaron las primeras 20. Podés ajustar la selección antes de generar el reporte.', color: 'warning' })
  }
  clearLoadedResults()
}

function clearLoadedResults() {
  summary.value = null
  activeDetail.value = null
  detail.value = null
  expandedRows.value = {}
  expandedItems.value = {}
  summaryError.value = ''
  detailError.value = ''
}

async function loadCompanies() {
  loadingCompanies.value = true
  try {
    companies.value = await service.getConsolidatedCompanies()
    selectedCompanyIds.value = companies.value.slice(0, 20).map(company => company.id)
  } catch (error: any) {
    summaryError.value = error?.data?.message ?? error?.message ?? 'No se pudieron cargar tus empresas.'
  } finally {
    loadingCompanies.value = false
  }
}

async function generateSummary() {
  if (!canGenerate.value) return false
  loadingSummary.value = true
  summaryError.value = ''
  activeDetail.value = null
  detail.value = null
  expandedRows.value = {}
  expandedItems.value = {}
  try {
    summary.value = await service.getFinancialResults({
      company_ids: selectedCompanyIds.value,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: selectedOvStatuses.value,
    })
    currencyFilter.value = 'ALL'
    return true
  } catch (error: any) {
    summaryError.value = error?.data?.message ?? error?.message ?? 'No se pudo generar el reporte.'
    return false
  } finally {
    loadingSummary.value = false
  }
}

function onGenerateSummary() {
  void generateSummary()
}

async function openDetail(row: SummaryRow, metric: FinancialResultsMetric) {
  if (!row.company_id || !row.counts[metric][row.currency_code]) return
  activeDetail.value = {
    company_id: row.company_id,
    company_name: row.company_name,
    metric,
  }
  detailCurrency.value = row.currency_code
  detailAccountKey.value = null
  detailSearch.value = ''
  detailPaymentState.value = 'ALL'
  detailPage.value = 1
  detailError.value = ''
  expandedRows.value = {}
  expandedItems.value = {}
  void loadDetail(1)
  await nextTick()
  detailSection.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}

async function loadDetail(page = detailPage.value) {
  const target = activeDetail.value
  if (!target) return
  detailLoading.value = true
  detailError.value = ''
  detailPage.value = page
  expandedRows.value = {}
  expandedItems.value = {}
  try {
    detail.value = await service.getFinancialResultsDetail({
      company_id: target.company_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: selectedOvStatuses.value,
      metric: target.metric,
      currency_code: detailCurrency.value,
      account_key: detailAccountKey.value ?? undefined,
      search: detailSearch.value.trim() || undefined,
      payment_state: ['sales_confirmed', 'pending_orders'].includes(target.metric) ? detailPaymentState.value : undefined,
      page,
      page_size: pageSize,
    })
  } catch (error: any) {
    detail.value = null
    detailError.value = error?.data?.message ?? error?.message ?? 'No se pudo cargar el detalle.'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  activeDetail.value = null
  detail.value = null
  expandedRows.value = {}
  expandedItems.value = {}
}

function selectAccount(row: FinancialResultsCompositionRow) {
  if (!activeDetail.value) return
  detailAccountKey.value = row.key
  detailPage.value = 1
  void loadDetail(1)
}

function showAllAccounts() {
  detailAccountKey.value = null
  detailPage.value = 1
  void loadDetail(1)
}

function onDetailPageChange(page: number) {
  detailPage.value = page
  void loadDetail(page)
}

let detailSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(detailSearch, () => {
  if (!activeDetail.value) return
  if (detailSearchTimer) clearTimeout(detailSearchTimer)
  detailSearchTimer = setTimeout(() => {
    detailPage.value = 1
    void loadDetail(1)
  }, 300)
})
watch(detailCurrency, (currency, previous) => {
  if (!activeDetail.value || currency === previous) return
  detailAccountKey.value = null
  detailPage.value = 1
  void loadDetail(1)
})
watch(detailPaymentState, () => {
  if (!activeDetail.value) return
  detailAccountKey.value = null
  detailPage.value = 1
  void loadDetail(1)
})

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value) || 0
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(amount)}`
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat('es-AR').format(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function formatGeneratedAt(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function metricRoute(row: FinancialResultsDetailRow) {
  if (['PAYMENT', 'EXPENSE', 'COLLECTION'].includes(row.document_category)) return `/erp/treasury/payments/${encodeURIComponent(row.document_id)}`
  if (row.document_category === 'ORDER') return `/erp/orders/${encodeURIComponent(row.document_id)}`
  if (row.document_category === 'INVOICE' && activeDetail.value?.metric === 'purchase_invoices') {
    return `/erp/purchases/purchases-documents/${encodeURIComponent(row.document_id)}`
  }
  return `/erp/sales/${encodeURIComponent(row.document_id)}`
}

function statusLabel(row: FinancialResultsDetailRow) {
  if (row.status === 'PAID') return 'Pagado'
  return getStatusLabel(row.document_category, Number(row.status))
}

function orderPaymentState(row: FinancialResultsDetailRow) {
  const total = Number(row.document_total_amount)
  const paid = Number(row.paid_amount ?? 0)
  return paid <= 0 ? 'Sin cobrar' : paid >= total ? 'Cobrada' : 'Cobro parcial'
}

async function toggleDocumentItems(row: FinancialResultsDetailRow) {
  if (!activeDetail.value || !row.expandable) return
  if (expandedRows.value[row.id]) {
    expandedRows.value = { ...expandedRows.value, [row.id]: false }
    return
  }
  expandedRows.value = { ...expandedRows.value, [row.id]: true }
  if (expandedItems.value[row.id]) return
  expandedLoading.value = { ...expandedLoading.value, [row.id]: true }
  try {
    expandedItems.value = {
      ...expandedItems.value,
      [row.id]: await service.getFinancialResultsDocumentItems({
        company_id: activeDetail.value.company_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        ov_statuses: selectedOvStatuses.value,
        metric: activeDetail.value.metric,
        document_id: row.document_id,
      }),
    }
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las partidas', description: error?.data?.message ?? error.message, color: 'error' })
    expandedRows.value = { ...expandedRows.value, [row.id]: false }
  } finally {
    expandedLoading.value = { ...expandedLoading.value, [row.id]: false }
  }
}

const summaryTableColumns = computed<ExtendedColumn<SummaryRow>[]>(() => {
  const metricColumn = (key: FinancialResultsMetric, label: string): ExtendedColumn<SummaryRow> => ({
    id: key,
    header: label,
    meta: { label, filter: false },
    cell: ({ row }: any) => {
      const original = row.original as SummaryRow
      const amount = original.metrics[key][original.currency_code] ?? '0'
      const count = original.counts[key][original.currency_code] ?? 0
      const orderInfo = key === 'sales_confirmed'
        ? h('div', { class: 'flex flex-col items-end gap-0.5 text-[11px] leading-4 text-muted' }, [
            h('span', `Cobrado: ${formatMoney(original.metrics.sales_order_paid[original.currency_code] ?? '0', original.currency_code)}`),
            h('span', `Pendiente: ${formatMoney(original.metrics.pending_orders[original.currency_code] ?? '0', original.currency_code)}`),
            h('span', `${original.counts.orders_paid_full[original.currency_code] ?? 0} cobradas · ${original.counts.orders_paid_partial[original.currency_code] ?? 0} parciales · ${original.counts.orders_unpaid[original.currency_code] ?? 0} sin cobrar`),
          ])
        : null
      if (!original.company_id || !count) {
        return h('div', { class: 'flex min-w-44 flex-col items-end gap-1 text-right tabular-nums' }, [h('span', { class: 'text-muted' }, formatMoney(amount, original.currency_code)), orderInfo])
      }
      return h('div', { class: 'flex min-w-44 flex-col items-end gap-1' }, [
        h(UButton, {
          label: formatMoney(amount, original.currency_code),
          variant: 'link',
          color: 'primary',
          size: 'sm',
          class: 'h-auto px-0 py-0 text-right font-semibold tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid',
          'aria-label': `Abrir ${label}: ${formatMoney(amount, original.currency_code)} en ${original.company_name}`,
          onClick: () => void openDetail(original, key),
        }),
        h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(count)} ${count === 1 ? 'documento' : 'documentos'}`),
        orderInfo,
      ])
    },
  })
  const differenceColumn = (key: 'sales_invoice_difference' | 'collections_payment_difference', label: string): ExtendedColumn<SummaryRow> => ({
    id: key,
    header: label,
    meta: { label, filter: false },
    cell: ({ row }: any) => {
      const original = row.original as SummaryRow
      const amount = Number(original.metrics[key][original.currency_code] ?? 0)
      return h('span', {
        class: `block min-w-32 text-right font-medium tabular-nums ${amount < 0 ? 'text-error' : amount > 0 ? 'text-success' : 'text-muted'}`,
      }, formatMoney(amount, original.currency_code))
    },
  })

  return [
    {
      accessorKey: 'company_name',
      header: 'Empresa',
      enableHiding: false,
      meta: { label: 'Empresa', filter: false, disableColumnVisibility: true },
      cell: ({ row }: any) => h('span', {
        class: row.original.is_total ? 'font-bold text-highlighted' : 'font-medium text-highlighted',
      }, row.original.company_name),
    },
    { accessorKey: 'currency_code', header: 'Moneda', meta: { label: 'Moneda', filter: false }, cell: ({ row }: any) => h(UBadge, { color: 'neutral', variant: 'subtle', label: row.original.currency_code }) },
    metricColumn('sales_confirmed', metricLabels.sales_confirmed),
    metricColumn('purchase_invoices', metricLabels.purchase_invoices),
    metricColumn('payments', 'Pagos realizados'),
    differenceColumn('sales_invoice_difference', 'Ventas − facturas'),
    metricColumn('collections', metricLabels.collections),
    differenceColumn('collections_payment_difference', 'Cobros − pagos'),
    metricColumn('pending_orders', metricLabels.pending_orders),
  ]
})

const compositionColumns: ExtendedColumn<FinancialResultsCompositionRow>[] = [
  {
    accessorKey: 'label',
    header: 'Cuenta / clasificación',
    meta: { label: 'Cuenta / clasificación', filter: false },
    cell: ({ row }: any) => h(UButton, {
      label: row.original.label,
      variant: 'link',
      color: detailAccountKey.value === row.original.key ? 'primary' : 'neutral',
      size: 'sm',
      class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left font-medium underline decoration-dotted underline-offset-4 hover:decoration-solid',
      'aria-label': `Filtrar los documentos de ${row.original.label}`,
      onClick: () => selectAccount(row.original),
    }),
  },
  { accessorKey: 'metric_type', header: 'Tipo', meta: { label: 'Tipo', filter: false }, cell: ({ row }: any) => row.original.metric_type ? h(UBadge, { label: row.original.metric_type, color: 'neutral', variant: 'subtle' }) : '—' },
  { accessorKey: 'document_count', header: 'Documentos', meta: { label: 'Documentos', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatCount(row.original.document_count)) },
  {
    accessorKey: 'amount',
    header: 'Importe',
    meta: { label: 'Importe', filter: false },
    cell: ({ row }: any) => h(UButton, {
      label: formatMoney(row.original.amount, row.original.currency_code),
      variant: 'link',
      color: 'primary',
      size: 'sm',
      class: 'ml-auto h-auto justify-end px-0 py-0 text-right font-semibold tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid',
      'aria-label': `Ver documentos por ${row.original.label}: ${formatMoney(row.original.amount, row.original.currency_code)}`,
      onClick: () => selectAccount(row.original),
    }),
  },
]

const expandedDetailOptions = { getRowCanExpand: (row: any) => Boolean(row.original.expandable) }
const orderPaymentColumns: ExtendedColumn<FinancialResultsDetailRow>[] = [
  { accessorKey: 'paid_amount', header: 'Cobrado en OV', meta: { label: 'Cobrado en OV', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums text-success' }, formatMoney(row.original.paid_amount ?? '0', row.original.currency_code)) },
  { id: 'pending_amount', header: 'Pendiente OV', meta: { label: 'Pendiente OV', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums text-warning' }, formatMoney(Math.max(0, Number(row.original.document_total_amount) - Number(row.original.paid_amount ?? 0)), row.original.currency_code)) },
  { id: 'payment_state', header: 'Cobro', meta: { label: 'Cobro', filter: false }, cell: ({ row }: any) => h(UBadge, { label: orderPaymentState(row.original), color: orderPaymentState(row.original) === 'Cobrada' ? 'success' : orderPaymentState(row.original) === 'Cobro parcial' ? 'warning' : 'neutral', variant: 'subtle' }) },
]
const detailColumns = computed<ExtendedColumn<FinancialResultsDetailRow>[]>(() => [
  { accessorKey: 'document_date', header: 'Fecha', meta: { label: 'Fecha', filter: false }, cell: ({ row }: any) => formatDate(row.original.document_date) },
  {
    accessorKey: 'document_reference',
    header: 'Documento / ID',
    meta: { label: 'Documento / ID', filter: false },
    cell: ({ row }: any) => h('div', { class: 'flex min-w-32 flex-col items-start' }, [
      h(UButton, {
        label: `${row.original.document_label} ${row.original.document_reference}`,
        to: metricRoute(row.original),
        variant: 'link',
        color: 'primary',
        size: 'xs',
        class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid',
      }),
      h('span', { class: 'text-[10px] text-muted' }, row.original.document_id),
    ]),
  },
  { accessorKey: 'party_name', header: 'Tercero / referencia', meta: { label: 'Tercero / referencia', filter: false }, cell: ({ row }: any) => h('div', { class: 'min-w-32' }, [h('span', row.original.party_name), row.original.reference ? h('span', { class: 'block text-xs text-muted' }, row.original.reference) : null]) },
  { accessorKey: 'account_name', header: 'Cuenta / concepto / origen', meta: { label: 'Cuenta / concepto / origen', filter: false }, cell: ({ row }: any) => h('div', { class: 'min-w-44' }, [h('span', { class: 'font-medium' }, row.original.account_name), row.original.metric_type ? h(UBadge, { label: row.original.metric_type, color: 'neutral', variant: 'subtle', class: 'ml-1' }) : null, h('span', { class: 'block text-xs text-muted' }, row.original.origin)]) },
  { accessorKey: 'amount', header: 'Importe en esta cuenta', meta: { label: 'Importe en esta cuenta', filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right font-medium tabular-nums' }, formatMoney(row.original.amount, row.original.currency_code)) },
  { accessorKey: 'document_total_amount', header: 'Total documento', meta: { label: 'Total documento', filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right tabular-nums text-muted' }, formatMoney(row.original.document_total_amount, row.original.currency_code)) },
  ...(['sales_confirmed', 'pending_orders'].includes(activeDetail.value?.metric ?? '') ? orderPaymentColumns : []),
  { accessorKey: 'status', header: 'Estado', meta: { label: 'Estado', filter: false }, cell: ({ row }: any) => h(UBadge, { label: statusLabel(row.original), color: row.original.status === 'PAID' || row.original.status === 5 || row.original.status === 2 ? 'success' : 'neutral', variant: 'subtle' }) },
  {
    id: 'items',
    header: '',
    meta: { label: 'Partidas', filter: false, disableColumnVisibility: true },
    cell: ({ row }: any) => row.original.expandable ? h(UButton, {
      icon: expandedRows.value[row.original.id] ? 'i-lucide-chevron-up' : 'i-lucide-list-tree',
      label: expandedRows.value[row.original.id] ? 'Ocultar partidas' : 'Ver partidas',
      variant: expandedRows.value[row.original.id] ? 'soft' : 'ghost',
      color: 'neutral',
      size: 'xs',
      'data-row-action': '',
      onClick: () => void toggleDocumentItems(row.original),
    }) : null,
  },
])
const itemColumns: ExtendedColumn<FinancialResultsDocumentItems['items'][number]>[] = [
  { accessorKey: 'product_name', header: 'Partida', meta: { label: 'Partida', filter: false }, cell: ({ row }: any) => h('div', { class: row.original.kind === 'DIFFERENCE' ? 'font-medium text-warning' : 'font-medium' }, [row.original.product_name, row.original.variant_name ? h('span', { class: 'block text-xs text-muted' }, `Variante: ${row.original.variant_name}`) : null]) },
  { accessorKey: 'quantity', header: 'Cantidad', meta: { label: 'Cantidad', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, row.original.quantity) },
  { accessorKey: 'account_name', header: 'Cuenta actual', meta: { label: 'Cuenta actual', filter: false } },
  { accessorKey: 'amount', header: 'Importe de la partida', meta: { label: 'Importe de la partida', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.amount, row.original.currency_code)) },
]

onMounted(loadCompanies)
onBeforeUnmount(() => {
  if (detailSearchTimer) clearTimeout(detailSearchTimer)
})
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1800px] px-4 pb-10 sm:px-6 lg:px-8">
    <div class="flex min-w-0 flex-col gap-5">
      <AppPageHeader title="Resultado y composición por empresa" description="Compará ventas, compras, pagos y cobros; abrí cada importe para llegar a las cuentas y documentos que lo componen.">
        <template #links>
          <UButton label="Otros reportes" icon="i-lucide-panels-top-left" to="/erp/reports/consolidated" color="neutral" variant="outline" />
        </template>
      </AppPageHeader>

      <section class="rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">Empresas y período</h2>
            <p class="mt-1 text-sm text-muted">Elegí una o varias empresas. Las monedas se comparan por separado.</p>
          </div>
          <UBadge color="neutral" variant="subtle">{{ selectedCompanyCountLabel }}</UBadge>
        </div>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-default pb-2">
          <p class="text-sm font-medium">Empresas disponibles para tu usuario</p>
          <UButton :label="allSelectableSelected ? 'Quitar selección' : companies.length > 20 ? 'Seleccionar hasta 20' : 'Seleccionar todas'" :icon="allSelectableSelected ? 'i-lucide-circle-minus' : 'i-lucide-check-check'" color="neutral" variant="outline" size="xs" :disabled="loadingCompanies || !companies.length" @click="toggleAllCompanies" />
        </div>
        <div v-if="loadingCompanies" class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"><USkeleton v-for="index in 4" :key="index" class="h-12 rounded-lg" /></div>
        <div v-else-if="companies.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label v-for="company in companies" :key="company.id" :class="['flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:border-primary/30', selectedCompanyIds.includes(company.id) ? 'border-primary/50 bg-primary/5' : 'border-default bg-elevated/10', !selectedCompanyIds.includes(company.id) && atCompanyLimit ? 'cursor-not-allowed opacity-50' : '']">
            <UCheckbox :model-value="selectedCompanyIds.includes(company.id)" :disabled="!selectedCompanyIds.includes(company.id) && atCompanyLimit" @update:model-value="toggleCompany(company.id, $event)" />
            <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-highlighted">{{ company.name }}</span><span class="block truncate text-xs text-muted">{{ company.subdomain }} · {{ company.role }}</span></span>
            <UIcon v-if="selectedCompanyIds.includes(company.id)" name="i-lucide-check-circle-2" class="size-4 shrink-0 text-primary" />
          </label>
        </div>
        <p v-if="companies.length > 20" class="mt-2 text-xs text-muted">El reporte admite hasta 20 empresas por consulta. Se preseleccionan las primeras 20 por nombre.</p>
        <UAlert v-if="!loadingCompanies && !companies.length" color="warning" variant="subtle" icon="i-lucide-building-2" title="No hay empresas disponibles" description="Tu usuario no tiene empresas asociadas para consultar este reporte." />

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" class="w-full" @update:model-value="clearLoadedResults" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" class="w-full" @update:model-value="clearLoadedResults" /></UFormField>
          <UButton label="Generar reporte" icon="i-lucide-file-chart-column" class="w-full justify-center sm:w-auto" :loading="loadingSummary" :disabled="!canGenerate || loadingCompanies" @click="onGenerateSummary" />
        </div>
        <p v-if="filters.date_from > filters.date_to" class="mt-2 text-sm text-error">La fecha Desde debe ser anterior o igual a Hasta.</p>
        <p v-else-if="!selectedCompanyIds.length" class="mt-2 text-sm text-muted">Seleccioná al menos una empresa para continuar.</p>
      </section>

      <UAlert v-if="summaryError" color="error" variant="soft" title="No se pudo preparar el reporte" :description="summaryError" icon="i-lucide-triangle-alert" />
      <div v-if="loadingSummary && !summary" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><USkeleton v-for="index in 4" :key="index" class="h-24 rounded-xl" /></div>

      <template v-if="summary">
        <section class="rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-highlighted">Resultado por empresa y moneda</h2><UBadge color="primary" variant="subtle">{{ summary.companies.length }} empresas</UBadge></div>
              <p class="mt-1 text-sm text-muted">{{ summary.period.from }} al {{ summary.period.to }} · Actualizado {{ formatGeneratedAt(summary.generated_at) }}</p>
            </div>
            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <UFormField label="Moneda" class="w-full sm:w-40"><USelect v-model="currencyFilter" :items="currencyOptions" value-key="value" class="w-full" :disabled="loadingSummary" /></UFormField>
              <UFormField label="Estados de OV" class="w-full sm:w-56">
                <USelectMenu v-model="draftOvStatuses" :items="ovStatusOptions" value-key="value" multiple placeholder="Elegir estados" class="w-full" :disabled="loadingSummary">
                  <template #default><span class="block min-w-0 truncate text-left">{{ draftOvStatusSelectionLabel }}</span></template>
                  <template #content-bottom><div class="border-t border-default p-1"><UButton label="Seleccionar todos" icon="i-lucide-check-check" color="neutral" variant="ghost" size="xs" class="w-full justify-start" :disabled="draftOvStatuses.length === ovStatusOptions.length" @click="selectAllDraftOvStatuses" /></div></template>
                </USelectMenu>
              </UFormField>
              <UButton v-if="ovStatusesChanged" label="Aplicar" icon="i-lucide-check" size="sm" class="w-full justify-center sm:w-auto" :loading="loadingSummary" :disabled="!draftOvStatuses.length" @click="applyOvStatuses" />
            </div>
          </div>

          <UAlert color="info" variant="subtle" icon="i-lucide-info" title="Cómo leer estos importes" class="mb-4">
            <template #description><p>Las OV de ventas incluyen los estados Aprobada a Cerrada (1 a 7), por fecha de la orden. El cobrado y el pendiente reflejan el acumulado al generar el reporte, no solo cobros del período. Las compras son facturas confirmadas; pagos y cobros del período se presentan aparte. “Ventas − facturas” y “Cobros − pagos” son comparaciones, no una utilidad contable definitiva.</p><p class="mt-1">Las cuentas corresponden a la asignación actual del producto. La diferencia hasta el total queda visible como impuestos, ajustes o partidas sin imputación. No se incluyen devengamientos ni notas de crédito/débito.</p></template>
          </UAlert>

          <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>Hacé clic en los importes subrayados para abrir su composición y los documentos.</span>
            <span>Los importes de distintas monedas nunca se suman.</span>
          </div>
          <div class="min-w-0 overflow-x-auto">
            <AsteriskTable
              compact
              storage-key="financial-results-company-summary"
              :data="summaryRows"
              :columns="summaryTableColumns"
              :filter-fields="[{ id: 'company_name', label: 'Empresa' }]"
              :sort-fields="[{ label: 'Empresa', value: 'company_name' }]"
              search-placeholder="Buscar empresa..."
              :table-min-width="1400"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-default pt-3 text-xs text-muted">
            <span>Ventas: {{ summary.criteria.sales_confirmed }}</span>
            <span>Pagos: {{ summary.criteria.payments }}</span>
            <span>Pendientes: {{ summary.criteria.pending_orders }}</span>
          </div>
        </section>
      </template>

      <section v-if="activeDetail" ref="detailSection" class="flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/20 bg-elevated/20 p-4 sm:p-5" aria-live="polite">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-default pb-3">
          <div class="flex min-w-0 items-start gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon :name="metricIcons[activeDetail.metric]" class="size-4" /></span>
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-highlighted">{{ activeDetail.company_name }} · {{ metricLabels[activeDetail.metric] }}</h2><UBadge color="neutral" variant="subtle">{{ detailCurrency }}</UBadge></div><p class="mt-1 text-sm text-muted">Composición por cuenta contable y documentos que forman el importe.</p></div>
          </div>
          <UButton label="Cerrar detalle" icon="i-lucide-x" color="neutral" variant="outline" size="sm" @click="closeDetail" />
        </div>

        <UAlert v-if="detailError" color="error" variant="soft" title="No se pudo cargar el subreporte" :description="detailError" icon="i-lucide-triangle-alert" />
        <div v-if="detailLoading && !detail" class="grid grid-cols-1 gap-3 sm:grid-cols-3"><USkeleton v-for="index in 3" :key="index" class="h-20 rounded-lg" /></div>

        <template v-if="detail">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default bg-default/30 px-3 py-2.5">
            <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span><span class="text-muted">Renglones:</span> <strong class="tabular-nums">{{ formatCount(detail.total_rows) }}</strong></span>
              <span><span class="text-muted">Documentos:</span> <strong class="tabular-nums">{{ formatCount(detail.total_documents) }}</strong></span>
              <span><span class="text-muted">Total filtrado:</span> <strong class="tabular-nums">{{ formatMoney(detail.total_amount, detailCurrency) }}</strong></span>
            </div>
            <UFormField label="Moneda" class="w-32"><USelect v-model="detailCurrency" :items="currentCurrencyOptions" value-key="value" size="sm" class="w-full" /></UFormField>
          </div>

          <div class="flex flex-col gap-4">
            <section class="rounded-lg border border-default bg-default/20 p-3 sm:p-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><h3 class="font-semibold text-highlighted">Composición por cuenta contable y tipo</h3><p class="text-xs text-muted">Elegí una cuenta para filtrar las partidas de abajo.</p></div>
                <UButton v-if="detailAccountKey" label="Ver todas las cuentas" icon="i-lucide-list" size="xs" color="neutral" variant="outline" @click="showAllAccounts" />
              </div>
              <div v-if="detailLoading && !detail.composition.length" class="space-y-2"><USkeleton class="h-8 w-full" /><USkeleton class="h-8 w-full" /></div>
              <div v-else-if="!visibleComposition.length" class="rounded-md border border-dashed border-default px-3 py-5 text-center text-sm text-muted">No hay cuentas o clasificaciones para esta moneda.</div>
              <div v-else class="min-w-0 overflow-x-auto">
                <AsteriskTable compact hide-toolbar hide-footer storage-key="financial-results-account-composition" :data="visibleComposition" :columns="compositionColumns" :get-row-id="(row: FinancialResultsCompositionRow) => `${row.key}:${row.currency_code}:${row.metric_type ?? ''}`" :table-min-width="700" />
              </div>
            </section>

            <section class="min-w-0 rounded-lg border border-default bg-default/20 p-3 sm:p-4">
              <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><h3 class="font-semibold text-highlighted">Documentos y partidas</h3><p class="mt-1 text-xs text-muted">El total documental puede repetirse cuando un documento tiene más de una cuenta; para conciliar, sumá “Importe en esta cuenta”.</p></div>
                <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                  <UFormField v-if="['sales_confirmed', 'pending_orders'].includes(activeDetail.metric)" label="Estado de cobro" class="w-full sm:w-44"><USelect v-model="detailPaymentState" :items="[{ label: 'Todos', value: 'ALL' }, { label: 'Sin cobrar', value: 'UNPAID' }, { label: 'Cobro parcial', value: 'PARTIAL' }, { label: 'Cobradas', value: 'PAID' }]" value-key="value" class="w-full" /></UFormField>
                  <UInput v-model="detailSearch" icon="i-lucide-search" placeholder="Buscar número, UUID, tercero o concepto" class="w-full sm:w-80" />
                </div>
              </div>
              <div v-if="selectedComposition" class="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm"><UBadge color="primary" variant="subtle">Cuenta</UBadge><span class="font-medium">{{ selectedComposition.label }}</span><span v-if="selectedComposition.metric_type" class="text-muted">· {{ selectedComposition.metric_type }}</span></div>
              <UAlert v-if="activeDetail.metric === 'pending_orders' && !detailAccountKey" class="mb-3" color="warning" variant="subtle" icon="i-lucide-info" title="Saldo sin distribución por cuenta" description="El pendiente se calcula como total de la OV menos cobrado. No se reparte entre cuentas de ingreso." />
              <div v-if="detailLoading && !detail.items.length" class="space-y-2"><USkeleton class="h-10 w-full" /><USkeleton class="h-10 w-full" /></div>
              <div v-else-if="!detail.items.length" class="rounded-md border border-dashed border-default px-3 py-8 text-center text-sm text-muted">No hay documentos para los filtros seleccionados.</div>
              <div v-else class="min-w-0 overflow-x-auto">
                <AsteriskTable
                  v-model:expanded="expandedRows"
                  compact
                  server-side
                  hide-toolbar
                  storage-key="financial-results-document-detail"
                  :data="detail.items"
                  :columns="detailColumns"
                  :expanded-options="expandedDetailOptions"
                  :get-row-id="(row: FinancialResultsDetailRow) => row.id"
                  :page-size="pageSize"
                  :page="detailPage"
                  :total-rows="detail.total_rows"
                  :table-min-width="['sales_confirmed', 'pending_orders'].includes(activeDetail.metric) ? 1650 : 1300"
                  @update:page="onDetailPageChange"
                >
                  <template #expanded="{ row }">
                    <div class="border-t border-default bg-muted/20 px-3 py-3 sm:px-4">
                      <div class="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p class="text-sm font-semibold text-highlighted">Partidas de {{ row.original.document_label }} {{ row.original.document_reference }}</p><p class="text-xs text-muted">El detalle conserva las cuentas actuales del producto; los impuestos y ajustes sin imputación se muestran como diferencia.</p></div><UBadge color="neutral" variant="subtle">{{ expandedItems[row.original.id]?.items.length ?? 0 }} partidas</UBadge></div>
                      <div v-if="expandedItems[row.original.id] && ['sales_confirmed', 'pending_orders'].includes(activeDetail.metric)" class="mb-3 flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-default px-3 py-2 text-xs tabular-nums">
                        <span>Total OV: <strong>{{ formatMoney(expandedItems[row.original.id]?.document_total_amount ?? '0', row.original.currency_code) }}</strong></span>
                        <span>Cobrado: <strong class="text-success">{{ formatMoney(expandedItems[row.original.id]?.paid_amount ?? '0', row.original.currency_code) }}</strong></span>
                        <span>Pendiente: <strong class="text-warning">{{ formatMoney(expandedItems[row.original.id]?.pending_amount ?? '0', row.original.currency_code) }}</strong></span>
                      </div>
                      <div v-if="expandedLoading[row.original.id]" class="space-y-2"><USkeleton class="h-8 w-full" /><USkeleton class="h-8 w-full" /></div>
                      <div v-else-if="expandedItems[row.original.id]" class="min-w-0 overflow-x-auto rounded-md border border-default bg-default/50"><AsteriskTable compact hide-toolbar hide-footer :storage-key="`financial-results-items-${row.original.document_id}`" :data="expandedItems[row.original.id]?.items ?? []" :columns="itemColumns" :get-row-id="(item: FinancialResultsDocumentItems['items'][number]) => item.id" :table-min-width="700" /></div>
                    </div>
                  </template>
                </AsteriskTable>
              </div>
            </section>
          </div>
        </template>
      </section>
    </div>
  </UPage>
</template>
