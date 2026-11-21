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
import { useCompanyNavigation } from '~/composables/useCompanyNavigation'

const props = withDefaults(defineProps<{ variant?: 'table' | 'executive' }>(), { variant: 'table' })

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
const { openCompanyPathInNewTab } = useCompanyNavigation()
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
const previousSummary = ref<FinancialResultsSummary | null>(null)
const comparisonUnavailable = ref(false)
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
const egresosSeparados = ref(false)
type ExecutiveGroup = 'sales' | 'purchases' | 'cash'
const executiveGroup = ref<ExecutiveGroup>('sales')
const executiveDetails = ref<HTMLDetailsElement | null>(null)
const exactAmountOpen = reactive<Record<string, boolean>>({})
const isExecutive = computed(() => props.variant === 'executive')

const metricLabels: Record<FinancialResultsMetric, string> = {
  sales_confirmed: 'OV confirmadas',
  purchase_invoices: 'Compras facturadas',
  purchase_invoices_paid: 'Facturas de compra con pagos aplicados',
  purchase_invoice_payments: 'Pagos aplicados a facturas',
  purchase_invoices_pending: 'Saldo pendiente de facturas',
  outflows: 'Salió · total de caja',
  payments: 'Pagos realizados',
  invoice_payment_outflows: 'Pagos de facturas · movimiento',
  non_invoice_payments: 'Otros pagos',
  expenses: 'Gastos realizados',
  other_outflows: 'Vales y obligaciones',
  non_invoice_outflows: 'Otros egresos sin factura',
  collections: 'Cobros realizados',
  pending_orders: 'Saldo de OV por cobrar',
  opening_balance_receivable: 'Saldo inicial por cobrar',
}
const metricIcons: Record<FinancialResultsMetric, string> = {
  sales_confirmed: 'i-lucide-trending-up',
  purchase_invoices: 'i-lucide-file-text',
  purchase_invoices_paid: 'i-lucide-circle-check',
  purchase_invoice_payments: 'i-lucide-receipt-text',
  purchase_invoices_pending: 'i-lucide-hourglass',
  outflows: 'i-lucide-arrow-up-right',
  payments: 'i-lucide-credit-card',
  invoice_payment_outflows: 'i-lucide-file-check-2',
  non_invoice_payments: 'i-lucide-wallet',
  expenses: 'i-lucide-receipt',
  other_outflows: 'i-lucide-wallet-cards',
  non_invoice_outflows: 'i-lucide-circle-dollar-sign',
  collections: 'i-lucide-hand-coins',
  pending_orders: 'i-lucide-hourglass',
  opening_balance_receivable: 'i-lucide-wallet',
}
const drillMetrics: FinancialResultsMetric[] = [
  'sales_confirmed', 'collections', 'pending_orders', 'purchase_invoices', 'purchase_invoices_paid', 'purchase_invoice_payments', 'purchase_invoices_pending', 'outflows', 'payments', 'invoice_payment_outflows', 'non_invoice_payments', 'expenses', 'other_outflows', 'non_invoice_outflows', 'opening_balance_receivable',
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
function amountToCents(value: string | number | undefined) {
  const raw = String(value ?? '0').trim()
  const negative = raw.startsWith('-')
  const normalized = raw.replace(/^[+-]/, '')
  const [whole = '0', fraction = ''] = normalized.split('.')
  const cents = BigInt(whole || '0') * 100n + BigInt((fraction + '00').slice(0, 2))
  return negative ? -cents : cents
}

function centsToMoney(cents: bigint, currency: string) {
  return formatMoney(Number(cents) / 100, currency)
}

function compactMoney(cents: bigint, currency: string) {
  const amount = Number(cents) / 100
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`
  }
}

function metricCents(metrics: FinancialResultsMetrics, key: keyof FinancialResultsMetrics, currency: string) {
  return amountToCents(metrics[key]?.[currency] ?? '0')
}

function previousPeriod() {
  const from = new Date(`${filters.date_from}T00:00:00.000Z`)
  const to = new Date(`${filters.date_to}T00:00:00.000Z`)
  const duration = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1
  const previousTo = new Date(from)
  previousTo.setUTCDate(previousTo.getUTCDate() - 1)
  const previousFrom = new Date(previousTo)
  previousFrom.setUTCDate(previousFrom.getUTCDate() - duration + 1)
  return {
    date_from: previousFrom.toISOString().slice(0, 10),
    date_to: previousTo.toISOString().slice(0, 10),
  }
}

function movementComparison(metric: 'collections' | 'outflows', currency: string) {
  if (!previousSummary.value) return null
  const current = metricCents(summary.value!.totals.metrics, metric, currency)
  const previous = metricCents(previousSummary.value.totals.metrics, metric, currency)
  const difference = current - previous
  const increased = difference > 0n
  const decreased = difference < 0n
  const percentage = previous === 0n
    ? null
    : Math.round(Number(difference < 0n ? -difference : difference) / Number(previous) * 1000) / 10
  const favorable = metric === 'collections' ? increased : decreased
  return {
    label: previous === 0n ? (current === 0n ? 'Sin variación' : 'Nuevo período') : `${increased ? '+' : decreased ? '−' : ''}${percentage}%`,
    period: 'vs. período anterior',
    current: centsToMoney(current, currency),
    previous: centsToMoney(previous, currency),
    difference: centsToMoney(difference, currency),
    icon: increased ? 'i-lucide-trending-up' : decreased ? 'i-lucide-trending-down' : 'i-lucide-minus',
    colorClass: increased || decreased ? (favorable ? 'text-success' : 'text-warning') : 'text-muted',
  }
}

const executiveCurrencyOptions = computed(() => currencyOptions.value.filter(option => option.value !== 'ALL'))
const executiveCards = computed(() => {
  if (!summary.value) return []
  const currency = currencyFilter.value === 'ALL' ? (executiveCurrencyOptions.value[0]?.value ?? 'ARS') : currencyFilter.value
  const metrics = summary.value.totals.metrics
  const counts = summary.value.totals.counts
  const pendingOrders = metricCents(metrics, 'pending_orders', currency)
  const openingBalance = metricCents(metrics, 'opening_balance_receivable', currency)
  const incoming = metricCents(metrics, 'collections', currency)
  const outgoing = metricCents(metrics, 'outflows', currency)
  return [
    {
      id: 'receivables', title: 'Me deben', kind: 'Saldo', group: 'sales' as const,
      amount: pendingOrders + openingBalance,
      count: (counts.pending_orders[currency] ?? 0) + (counts.opening_balance_receivable[currency] ?? 0),
      countLabel: `${formatCount(counts.pending_orders[currency] ?? 0)} OV pendientes · ${formatCount(counts.opening_balance_receivable[currency] ?? 0)} saldos previos`,
      description: 'Suma OV con saldo dentro del período/estados seleccionados más saldos iniciales abiertos al Hasta. No suma ni concilia por separado las facturas de venta asociadas.',
      breakdown: [
        { label: 'OV por cobrar', amount: pendingOrders },
        { label: 'Saldo inicial por cobrar', amount: openingBalance },
      ],
      icon: 'i-lucide-hand-coins', tone: 'blue', comparison: null,
    },
    {
      id: 'payables', title: 'Debo', kind: 'Saldo', group: 'purchases' as const,
      amount: metricCents(metrics, 'purchase_invoices_pending', currency),
      count: counts.purchase_invoices_pending[currency] ?? 0,
      countLabel: `${formatCount(counts.purchase_invoices_pending[currency] ?? 0)} facturas con saldo`,
      description: 'Saldo actual de facturas de compra confirmadas con fecha dentro del período. Los pagos aplicados durante el período se muestran por separado en Compras.',
      breakdown: [],
      icon: 'i-lucide-file-clock', tone: 'amber', comparison: null,
    },
    {
      id: 'incoming', title: 'Entró', kind: 'Movimiento', group: 'cash' as const,
      amount: incoming,
      count: counts.collections[currency] ?? 0,
      countLabel: `${formatCount(counts.collections[currency] ?? 0)} cobros pagados en el período`,
      description: 'Cobros por fecha efectiva del movimiento.',
      breakdown: [],
      icon: 'i-lucide-arrow-down-left', tone: 'green', comparison: movementComparison('collections', currency),
    },
    {
      id: 'outgoing', title: 'Salió', kind: 'Movimiento', group: 'cash' as const,
      amount: outgoing,
      count: counts.outflows[currency] ?? 0,
      countLabel: `${formatCount(counts.outflows[currency] ?? 0)} egresos pagados en el período`,
      description: 'Total de salidas por fecha efectiva. Incluye movimientos de pago vinculados a facturas, otros pagos, gastos directos y vales u obligaciones independientes.',
      breakdown: [
        { label: 'Pagos con factura vinculada · movimiento completo', amount: metricCents(metrics, 'invoice_payment_outflows', currency) },
        { label: 'Otros pagos sin factura asociada', amount: metricCents(metrics, 'non_invoice_payments', currency) },
        { label: 'Gastos directos', amount: metricCents(metrics, 'expenses', currency) },
        { label: 'Vales y obligaciones sin pago asociado', amount: metricCents(metrics, 'other_outflows', currency) },
      ],
      icon: 'i-lucide-arrow-up-right', tone: 'rose', comparison: movementComparison('outflows', currency),
    },
  ]
})
const cashResultCents = computed(() => {
  const incoming = executiveCards.value.find(card => card.id === 'incoming')?.amount ?? 0n
  const outgoing = executiveCards.value.find(card => card.id === 'outgoing')?.amount ?? 0n
  return incoming - outgoing
})
const cashResultNegative = computed(() => cashResultCents.value < 0n)
const executiveRows = computed(() => summaryRows.value.filter(row => row.currency_code === currencyFilter.value))
const outflowReconciliation = computed(() => {
  if (!summary.value) return { matches: true, mismatches: [] as string[] }
  const currency = currencyFilter.value
  const rows = summary.value.companies.map(company => {
    const metrics = company.metrics
    const components = metricCents(metrics, 'invoice_payment_outflows', currency)
      + metricCents(metrics, 'non_invoice_payments', currency)
      + metricCents(metrics, 'expenses', currency)
      + metricCents(metrics, 'other_outflows', currency)
    const total = metricCents(metrics, 'outflows', currency)
    return { name: company.company_name, matches: components === total }
  })
  return { matches: rows.every(row => row.matches), mismatches: rows.filter(row => !row.matches).map(row => row.name) }
})

function openExecutiveDetails(group: ExecutiveGroup) {
  executiveGroup.value = group
  nextTick(() => {
    if (!executiveDetails.value) return
    executiveDetails.value.open = true
    executiveDetails.value.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  })
}

const currentCurrencyOptions = computed(() => {
  const currencies = [...new Set((detail.value?.composition ?? []).map(row => row.currency_code))].sort()
  if (!currencies.includes(detailCurrency.value)) currencies.unshift(detailCurrency.value)
  return currencies.map(currency => ({ label: currency, value: currency }))
})
const visibleComposition = computed(() => (detail.value?.composition ?? [])
  .filter(row => row.currency_code === detailCurrency.value))
const selectedComposition = computed(() => visibleComposition.value.find(row => row.key === detailAccountKey.value) ?? null)
const selectedCompanyCountLabel = computed(() => `${selectedCompanyIds.value.length} de ${companies.value.length} empresas`)
const invoiceMetrics = ['purchase_invoices', 'purchase_invoices_paid', 'purchase_invoices_pending']
const paymentStateMetrics = ['sales_confirmed', 'pending_orders', ...invoiceMetrics]
const hasPaymentStateFilter = computed(() => paymentStateMetrics.includes(activeDetail.value?.metric ?? ''))
const detailPaymentStateLabel = computed(() => invoiceMetrics.includes(activeDetail.value?.metric ?? '') ? 'Estado de pago' : 'Estado de cobro')
const detailPaymentStateOptions = computed(() => invoiceMetrics.includes(activeDetail.value?.metric ?? '')
  ? activeDetail.value?.metric === 'purchase_invoices_paid'
    ? [{ label: 'Todos', value: 'ALL' }, { label: 'Pago parcial', value: 'PARTIAL' }, { label: 'Pagadas', value: 'PAID' }]
    : [{ label: 'Todos', value: 'ALL' }, { label: 'Sin pagar', value: 'UNPAID' }, { label: 'Pago parcial', value: 'PARTIAL' }, { label: 'Pagadas', value: 'PAID' }]
  : [{ label: 'Todos', value: 'ALL' }, { label: 'Sin cobrar', value: 'UNPAID' }, { label: 'Cobro parcial', value: 'PARTIAL' }, { label: 'Cobradas', value: 'PAID' }])
const detailAmountLabel = computed(() => activeDetail.value?.metric === 'purchase_invoices_pending'
  ? 'Saldo pendiente considerado'
  : activeDetail.value?.metric === 'purchase_invoices_paid'
    ? 'Importe pagado acumulado'
    : activeDetail.value?.metric === 'purchase_invoices'
      ? detailAccountKey.value ? 'Importe en esta cuenta' : 'Importe contabilizado'
      : activeDetail.value?.metric === 'purchase_invoice_payments'
        ? 'Importe aplicado (moneda del pago)'
        : 'Importe en esta cuenta')
const detailRecordCountLabel = computed(() => activeDetail.value?.metric === 'purchase_invoice_payments'
  ? 'Aplicaciones'
  : activeDetail.value?.metric === 'purchase_invoices_paid'
    ? 'Facturas con pagos'
    : 'Documentos')

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
  previousSummary.value = null
  comparisonUnavailable.value = false
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
  previousSummary.value = null
  comparisonUnavailable.value = false
  activeDetail.value = null
  detail.value = null
  expandedRows.value = {}
  expandedItems.value = {}
  try {
    const request = {
      company_ids: selectedCompanyIds.value,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: selectedOvStatuses.value,
    }
    summary.value = await service.getFinancialResults(request)
    previousSummary.value = null
    if (isExecutive.value) {
      const previous = previousPeriod()
      try {
        previousSummary.value = await service.getFinancialResults({ ...request, ...previous })
      } catch {
        comparisonUnavailable.value = true
      }
    }
    if (isExecutive.value) {
      const availableCurrencies = currencyOptions.value.map(option => option.value).filter(value => value !== 'ALL')
      currencyFilter.value = availableCurrencies.includes('ARS') ? 'ARS' : availableCurrencies[0] ?? 'ARS'
    } else {
      currencyFilter.value = 'ALL'
    }
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

function toggleOutflowsGrouping() {
  egresosSeparados.value = !egresosSeparados.value
  if (activeDetail.value) closeDetail()
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
      payment_state: paymentStateMetrics.includes(target.metric) ? detailPaymentState.value : undefined,
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
  if (activeDetail.value?.metric === 'opening_balance_receivable' && row.party_id) {
    return `/erp/treasury/current-accounts/${encodeURIComponent(row.party_id)}`
  }
  if (['PAYMENT', 'EXPENSE', 'COLLECTION'].includes(row.document_category)) return `/erp/treasury/payments/${encodeURIComponent(row.document_id)}`
  if (row.document_category === 'HR_VALE') return '/erp/rrhh/vales'
  if (row.document_category === 'TREASURY_OBLIGATION') return '/erp/treasury/taxes-services?view=reports'
  if (row.document_category === 'ORDER') return `/erp/orders/${encodeURIComponent(row.document_id)}`
  if (row.document_category === 'INVOICE' && invoiceMetrics.includes(activeDetail.value?.metric ?? '')) {
    return `/erp/purchases/purchases-documents/${encodeURIComponent(row.document_id)}`
  }
  return `/erp/sales/${encodeURIComponent(row.document_id)}`
}

function openSourceDocument(row: FinancialResultsDetailRow) {
  if (!activeDetail.value) return
  openCompanyPathInNewTab(activeDetail.value.company_id, metricRoute(row))
}

function openRelatedDocument(row: FinancialResultsDetailRow) {
  if (!activeDetail.value || !row.related_document_id) return
  openCompanyPathInNewTab(
    activeDetail.value.company_id,
    `/erp/purchases/purchases-documents/${encodeURIComponent(row.related_document_id)}`,
  )
}

function statusLabel(row: FinancialResultsDetailRow) {
  if (row.status === 'PAID') return 'Pagado'
  return getStatusLabel(row.document_category, Number(row.status))
}

function paymentStateLabel(row: FinancialResultsDetailRow) {
  const invoice = invoiceMetrics.includes(activeDetail.value?.metric ?? '')
  if (row.payment_state === 'PAID') return invoice ? 'Pagada' : 'Cobrada'
  if (row.payment_state === 'PARTIAL') return invoice ? 'Pago parcial' : 'Cobro parcial'
  return invoice ? 'Sin pagar' : 'Sin cobrar'
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
      if (!original.company_id || !count) {
        return h('div', { class: 'min-w-44 text-right tabular-nums text-muted' }, formatMoney(amount, original.currency_code))
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
      ])
    },
  })
  const invoiceColumn: ExtendedColumn<SummaryRow> = {
    id: 'purchase_invoices',
    header: 'Compras/Gastos · Facturas de compra',
    meta: { label: 'Compras/Gastos · Facturas de compra', filter: false },
    cell: ({ row }: any) => {
      const original = row.original as SummaryRow
      const currency = original.currency_code
      const entries: Array<{ key: FinancialResultsMetric; label: string; countLabel: string; tone: string }> = [
        { key: 'purchase_invoices', label: 'Facturado en el período', countLabel: 'facturas', tone: 'text-highlighted' },
        { key: 'purchase_invoices_paid', label: 'Con pagos aplicados · acumulado actual', countLabel: 'con pagos', tone: 'text-success' },
        { key: 'purchase_invoices_pending', label: 'Saldo pendiente actual', countLabel: 'con saldo', tone: 'text-warning' },
      ]
      return h('div', { class: 'flex min-w-64 flex-col items-end gap-2 text-right tabular-nums' }, entries.map(entry => {
        const amount = original.metrics[entry.key][currency] ?? '0'
        const count = original.counts[entry.key][currency] ?? 0
        const value = original.company_id && count
          ? h(UButton, {
              label: formatMoney(amount, currency),
              variant: 'link', color: entry.tone.includes('warning') ? 'warning' : 'primary', size: 'xs',
              class: `h-auto px-0 py-0 font-semibold tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid ${entry.tone}`,
              'aria-label': `Abrir ${entry.label}: ${formatMoney(amount, currency)} en ${original.company_name}`,
              onClick: () => void openDetail(original, entry.key),
            })
          : h('span', { class: `font-semibold ${entry.tone}` }, formatMoney(amount, currency))
        return h('div', { class: 'flex flex-col items-end' }, [
          h('span', { class: 'text-[10px] leading-4 text-muted' }, entry.label),
          value,
          h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(count)} ${entry.countLabel}`),
        ])
      }))
    },
  }
  const paidOrdersColumn: ExtendedColumn<SummaryRow> = {
    id: 'sales_order_paid',
    header: 'Ventas · Cobrado aplicado en OV',
    meta: { label: 'Ventas · Cobrado aplicado en OV', filter: false },
    cell: ({ row }: any) => h('span', { class: 'block min-w-40 text-right font-medium tabular-nums text-success' }, formatMoney(row.original.metrics.sales_order_paid[row.original.currency_code] ?? '0', row.original.currency_code)),
  }
  const columns: ExtendedColumn<SummaryRow>[] = [
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
    metricColumn('sales_confirmed', 'Ventas · OV aprobadas'),
    metricColumn('collections', 'Ventas · Cobros realizados'),
    paidOrdersColumn,
    metricColumn('pending_orders', 'Ventas · Saldo de OV por cobrar'),
    invoiceColumn,
  ]
  if (egresosSeparados.value) {
    columns.push(
      metricColumn('non_invoice_payments', 'Compras/Gastos · Otros pagos del período sin factura'),
      metricColumn('expenses', 'Compras/Gastos · Gastos (EXPENSE)'),
      metricColumn('other_outflows', 'Compras/Gastos · Vales y obligaciones'),
    )
  } else {
    columns.push(metricColumn('non_invoice_outflows', 'Compras/Gastos · Otros egresos del período sin pagos de facturas'))
  }
  return columns
})

function executiveMetricColumn(key: FinancialResultsMetric, label: string): ExtendedColumn<SummaryRow> {
  return {
    id: key,
    header: label,
    meta: { label, filter: false },
    cell: ({ row }: any) => {
      const original = row.original as SummaryRow
      const amount = original.metrics[key][original.currency_code] ?? '0'
      const count = original.counts[key][original.currency_code] ?? 0
      if (!original.company_id || !count) {
        return h('div', { class: 'min-w-40 text-right tabular-nums' }, formatMoney(amount, original.currency_code))
      }
      return h('div', { class: 'flex min-w-40 flex-col items-end gap-1' }, [
        h(UButton, {
          label: formatMoney(amount, original.currency_code),
          variant: 'link', color: 'primary', size: 'sm',
          class: 'h-auto px-0 py-0 text-right font-semibold tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid',
          'aria-label': `Abrir ${label}: ${formatMoney(amount, original.currency_code)} en ${original.company_name}`,
          onClick: () => void openDetail(original, key),
        }),
        h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(count)} ${count === 1 ? 'registro' : 'registros'}`),
      ])
    },
  }
}

function salesOrderAppliedColumn(): ExtendedColumn<SummaryRow> {
  return {
    id: 'sales_order_paid',
    header: 'Cobrado aplicado (acumulado)',
    meta: { label: 'Cobrado aplicado (acumulado)', filter: false },
    cell: ({ row }: any) => h('span', {
      class: 'block min-w-40 text-right font-medium tabular-nums text-success',
    }, formatMoney(row.original.metrics.sales_order_paid[row.original.currency_code] ?? '0', row.original.currency_code)),
  }
}

function purchaseInvoiceFlowColumn(): ExtendedColumn<SummaryRow> {
  return {
    id: 'purchase_invoice_flow',
    header: 'Compras · facturas, pagos aplicados y saldo',
    meta: { label: 'Compras · facturas, pagos aplicados y saldo', filter: false },
    cell: ({ row }: any) => {
      const original = row.original as SummaryRow
      const currency = original.currency_code
      const total = original.metrics.purchase_invoices[currency] ?? '0'
      const applied = original.metrics.purchase_invoice_payments[currency] ?? '0'
      const pending = original.metrics.purchase_invoices_pending[currency] ?? '0'
      const invoiceCount = original.counts.purchase_invoices[currency] ?? 0
      const applicationCount = original.counts.purchase_invoice_payments[currency] ?? 0
      const pendingCount = original.counts.purchase_invoices_pending[currency] ?? 0
      const hasAny = invoiceCount > 0 || applicationCount > 0 || pendingCount > 0
      const amount = (label: string, value: string, metric: FinancialResultsMetric, count: number, tone: string) => {
        const text = `${label} · ${formatMoney(value, currency)}`
        if (!original.company_id || !count) return h('span', { class: `text-xs tabular-nums ${tone}` }, text)
        return h(UButton, {
          label: text,
          variant: 'link', color: tone.includes('warning') ? 'warning' : 'primary', size: 'xs',
          class: `h-auto px-0 py-0 text-xs tabular-nums underline decoration-dotted underline-offset-4 hover:decoration-solid ${tone}`,
          'aria-label': `Abrir ${label.toLowerCase()}: ${formatMoney(value, currency)} en ${currency}`,
          onClick: () => void openDetail(original, metric),
        })
      }
      if (!original.company_id || !hasAny) {
        return h('div', { class: 'flex min-w-72 flex-col items-end gap-1.5 text-right tabular-nums' }, [
          amount('Facturado en el período', total, 'purchase_invoices', invoiceCount, 'font-medium text-highlighted'),
          amount('Pagado aplicado en el período (moneda del pago)', applied, 'purchase_invoice_payments', applicationCount, 'text-success'),
          amount('Saldo actual de facturas del período', pending, 'purchase_invoices_pending', pendingCount, 'text-warning'),
        ])
      }
      return h('div', { class: 'flex min-w-72 flex-col items-end gap-1.5' }, [
        h('div', { class: 'flex flex-col items-end' }, [
          amount('Facturado en el período', total, 'purchase_invoices', invoiceCount, 'font-medium text-highlighted'),
          h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(invoiceCount)} ${invoiceCount === 1 ? 'factura' : 'facturas'}`),
        ]),
        h('div', { class: 'flex flex-col items-end' }, [
          amount('Pagado aplicado en el período (moneda del pago)', applied, 'purchase_invoice_payments', applicationCount, 'text-success'),
          h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(applicationCount)} ${applicationCount === 1 ? 'aplicación' : 'aplicaciones'} · puede incluir facturas de períodos anteriores`),
        ]),
        h('div', { class: 'flex flex-col items-end' }, [
          amount('Saldo actual de facturas del período', pending, 'purchase_invoices_pending', pendingCount, 'text-warning'),
          h('span', { class: 'text-[10px] leading-4 text-muted' }, `${formatCount(pendingCount)} ${pendingCount === 1 ? 'factura con saldo' : 'facturas con saldo'}`),
        ]),
      ])
    },
  }
}

const companyAndCurrencyColumns = computed(() => summaryTableColumns.value.slice(0, 2))
const executiveGroupColumns = computed<ExtendedColumn<SummaryRow>[]>(() => {
  const base = companyAndCurrencyColumns.value
  if (executiveGroup.value === 'sales') {
    return [...base,
      executiveMetricColumn('sales_confirmed', 'OV confirmadas'),
      salesOrderAppliedColumn(),
      executiveMetricColumn('pending_orders', 'OV por cobrar'),
      executiveMetricColumn('opening_balance_receivable', 'Saldo previo por cobrar'),
    ]
  }
  if (executiveGroup.value === 'purchases') {
    return [...base, purchaseInvoiceFlowColumn()]
  }
  return [...base,
    executiveMetricColumn('collections', 'Entró · cobros'),
    executiveMetricColumn('outflows', 'Salió · egresos totales'),
    executiveMetricColumn('invoice_payment_outflows', 'Pagos con factura vinculada · movimiento'),
    executiveMetricColumn('non_invoice_payments', 'Otros pagos sin factura'),
    executiveMetricColumn('expenses', 'Gastos directos'),
    executiveMetricColumn('other_outflows', 'Vales y obligaciones sin PAYMENT'),
  ]
})
const executiveTableMinWidth = computed(() => executiveGroup.value === 'sales' ? 1250 : executiveGroup.value === 'purchases' ? 1100 : 2200)
const executiveGroupOptions: Array<{ id: ExecutiveGroup; label: string; icon: string }> = [
  { id: 'sales', label: 'Ventas', icon: 'i-lucide-trending-up' },
  { id: 'purchases', label: 'Compras', icon: 'i-lucide-file-text' },
  { id: 'cash', label: 'Caja', icon: 'i-lucide-wallet' },
]

const compositionColumns = computed<ExtendedColumn<FinancialResultsCompositionRow>[]>(() => [
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
  { accessorKey: 'document_count', header: activeDetail.value?.metric === 'purchase_invoice_payments' ? 'Aplicaciones' : 'Documentos', meta: { label: activeDetail.value?.metric === 'purchase_invoice_payments' ? 'Aplicaciones' : 'Documentos', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatCount(row.original.document_count)) },
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
])

const expandedDetailOptions = { getRowCanExpand: (row: any) => Boolean(row.original.expandable) }
function documentPaymentColumns(): ExtendedColumn<FinancialResultsDetailRow>[] {
  const invoice = invoiceMetrics.includes(activeDetail.value?.metric ?? '')
  const paidMetric = activeDetail.value?.metric === 'purchase_invoices_paid'
  const appliedLabel = invoice ? 'Importe pagado' : 'Cobrado aplicado'
  const pendingLabel = invoice ? 'Saldo pendiente' : 'Saldo de OV por cobrar'
  const stateLabel = invoice ? 'Estado de pago' : 'Estado de cobro'
  return [
    ...(!paidMetric ? [{ accessorKey: 'paid_amount', header: appliedLabel, meta: { label: appliedLabel, filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right tabular-nums text-success' }, formatMoney(row.original.paid_amount ?? '0', row.original.currency_code)) } as ExtendedColumn<FinancialResultsDetailRow>] : []),
    { accessorKey: 'pending_amount', header: pendingLabel, meta: { label: pendingLabel, filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right tabular-nums text-warning' }, formatMoney(row.original.pending_amount ?? '0', row.original.currency_code)) },
    { id: 'payment_state', header: stateLabel, meta: { label: stateLabel, filter: false }, cell: ({ row }: any) => {
      const status = row.original.payment_state
      return h(UBadge, {
        label: paymentStateLabel(row.original),
        color: status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'neutral',
        variant: 'subtle',
      })
    } },
  ]
}
const detailColumns = computed<ExtendedColumn<FinancialResultsDetailRow>[]>(() => [
  { accessorKey: 'document_date', header: 'Fecha', meta: { label: 'Fecha', filter: false }, cell: ({ row }: any) => formatDate(row.original.document_date) },
  {
    accessorKey: 'document_reference',
    header: 'Documento / ID',
    meta: { label: 'Documento / ID', filter: false },
    cell: ({ row }: any) => h('div', { class: 'flex min-w-40 flex-col items-start' }, [
      h(UButton, {
        label: `${row.original.document_label} ${row.original.document_reference}`,
        variant: 'link',
        color: 'primary',
        size: 'xs',
        class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid',
        onClick: () => openSourceDocument(row.original),
      }),
      row.original.related_document_id ? h(UButton, {
        label: row.original.related_document_reference ?? 'Ver factura asociada',
        variant: 'link', color: 'neutral', size: 'xs',
        class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left text-[11px] underline decoration-dotted underline-offset-4 hover:decoration-solid',
        onClick: () => openRelatedDocument(row.original),
      }) : null,
      h('span', { class: 'text-[10px] text-muted' }, row.original.document_id),
    ]),
  },
  { accessorKey: 'party_name', header: 'Tercero / referencia', meta: { label: 'Tercero / referencia', filter: false }, cell: ({ row }: any) => h('div', { class: 'min-w-32' }, [h('span', row.original.party_name), row.original.reference ? h('span', { class: 'block text-xs text-muted' }, row.original.reference) : null]) },
  { accessorKey: 'account_name', header: 'Cuenta / concepto / origen', meta: { label: 'Cuenta / concepto / origen', filter: false }, cell: ({ row }: any) => h('div', { class: 'min-w-44' }, [h('span', { class: 'font-medium' }, row.original.account_name), row.original.metric_type ? h(UBadge, { label: row.original.metric_type, color: 'neutral', variant: 'subtle', class: 'ml-1' }) : null, h('span', { class: 'block text-xs text-muted' }, row.original.origin)]) },
  { accessorKey: 'amount', header: detailAmountLabel.value, meta: { label: detailAmountLabel.value, filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right font-medium tabular-nums' }, formatMoney(row.original.amount, row.original.currency_code)) },
  ...(activeDetail.value?.metric === 'purchase_invoice_payments' ? [] : [{ accessorKey: 'document_total_amount', header: invoiceMetrics.includes(activeDetail.value?.metric ?? '') ? 'Total factura' : 'Total documento', meta: { label: 'Total documento', filter: false }, cell: ({ row }: any) => h('span', { class: 'block min-w-32 text-right tabular-nums text-muted' }, formatMoney(row.original.document_total_amount, row.original.currency_code)) } as ExtendedColumn<FinancialResultsDetailRow>]),
  ...(hasPaymentStateFilter.value ? documentPaymentColumns() : []),
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
      <AppPageHeader :title="isExecutive ? 'Resultado financiero · Vista de prueba' : 'Resultado y composición por empresa'" :description="isExecutive ? 'Una lectura rápida de saldos y movimientos, con detalle por empresa, cuenta y documento.' : 'Compará ventas, compras, pagos y cobros; abrí cada importe para llegar a las cuentas y documentos que lo componen.'">
        <template #links>
          <UButton v-if="isExecutive" label="Volver al reporte actual" icon="i-lucide-table-properties" to="/erp/reports/financial-results" color="neutral" variant="outline" />
          <UButton v-else label="Probar vista ejecutiva" icon="i-lucide-layout-dashboard" to="/erp/reports/financial-results-preview" color="primary" variant="outline" />
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
        <section v-if="isExecutive" class="flex flex-col gap-4 rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-highlighted">Lectura rápida</h2><UBadge color="primary" variant="subtle">{{ summary.companies.length }} empresas</UBadge></div>
              <p class="mt-1 text-sm text-muted">{{ formatDate(summary.period.from) }} al {{ formatDate(summary.period.to) }} · Actualizado {{ formatGeneratedAt(summary.generated_at) }}</p>
            </div>
            <UFormField label="Moneda" class="w-full sm:w-40"><USelect v-model="currencyFilter" :items="executiveCurrencyOptions" value-key="value" class="w-full" :disabled="loadingSummary" /></UFormField>
          </div>

          <UAlert color="neutral" variant="subtle" icon="i-lucide-info" title="Lectura separada" description="Saldos y movimientos responden preguntas distintas. No sumes facturas, pagos y cobros como si fueran operaciones independientes; cada moneda se consulta por separado." />
          <UAlert v-if="comparisonUnavailable" color="warning" variant="subtle" icon="i-lucide-chart-no-axes-combined" title="No se pudo cargar la comparación" description="El período actual está disponible. La variación anterior no se muestra hasta poder consultar ambos períodos." />

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <article v-for="card in executiveCards" :key="card.id" :class="[
              'flex min-w-0 flex-col gap-3 rounded-xl border p-4 sm:p-5',
              card.tone === 'blue' ? 'border-info/25 bg-info/5' : '',
              card.tone === 'amber' ? 'border-warning/25 bg-warning/5' : '',
              card.tone === 'green' ? 'border-success/25 bg-success/5' : '',
              card.tone === 'rose' ? 'border-error/25 bg-error/5' : '',
            ]">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span :class="[
                    'grid size-10 shrink-0 place-items-center rounded-lg',
                    card.tone === 'blue' ? 'bg-info/10 text-info' : '',
                    card.tone === 'amber' ? 'bg-warning/10 text-warning' : '',
                    card.tone === 'green' ? 'bg-success/10 text-success' : '',
                    card.tone === 'rose' ? 'bg-error/10 text-error' : '',
                  ]"><UIcon :name="card.icon" class="size-5" /></span>
                  <div class="min-w-0"><h3 class="font-semibold text-highlighted">{{ card.title }}</h3><p class="text-xs text-muted">{{ card.kind }}</p></div>
                </div>
                <UBadge color="neutral" variant="subtle">{{ currencyFilter }}</UBadge>
              </div>
              <p class="break-words text-3xl font-bold tracking-tight text-highlighted tabular-nums sm:text-4xl" :title="centsToMoney(card.amount, currencyFilter)" :aria-label="`${card.title}: ${centsToMoney(card.amount, currencyFilter)}`">{{ compactMoney(card.amount, currencyFilter) }}</p>
              <p class="min-h-9 text-sm text-muted">{{ card.countLabel }}</p>
              <div v-if="card.breakdown.length" class="space-y-1 rounded-md border border-default/60 bg-default/20 px-2.5 py-2">
                <div v-for="part in card.breakdown" :key="part.label" class="flex items-start justify-between gap-2 text-[11px] leading-4">
                  <span class="min-w-0 text-muted">{{ part.label }}</span>
                  <span class="shrink-0 text-right font-medium tabular-nums" :title="centsToMoney(part.amount, currencyFilter)">{{ centsToMoney(part.amount, currencyFilter) }}</span>
                </div>
              </div>
              <div v-if="card.comparison" class="flex items-center gap-1.5 text-xs" :class="card.comparison.colorClass">
                <UIcon :name="card.comparison.icon" class="size-4 shrink-0" />
                <span class="font-semibold">{{ card.comparison.label }}</span><span class="text-muted">{{ card.comparison.period }}</span>
              </div>
              <p class="text-xs text-muted">{{ card.description }}</p>
              <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-default/70 pt-3">
                <UPopover v-model:open="exactAmountOpen[card.id]" :content="{ align: 'start' }">
                  <UButton label="Importe exacto" icon="i-lucide-info" color="neutral" variant="ghost" size="xs" />
                  <template #content>
                    <div class="max-w-72 space-y-2 p-1 text-sm">
                      <p class="font-semibold text-highlighted">{{ card.title }} · {{ currencyFilter }}</p>
                      <p class="text-lg font-bold tabular-nums">{{ centsToMoney(card.amount, currencyFilter) }}</p>
                      <p class="text-xs text-muted">{{ card.description }}</p>
                      <template v-if="card.comparison">
                        <div class="border-t border-default pt-2 text-xs text-muted">Período actual: {{ card.comparison.current }}<br>Período anterior: {{ card.comparison.previous }}<br>Diferencia: {{ card.comparison.difference }}</div>
                      </template>
                    </div>
                  </template>
                </UPopover>
                <UButton label="Ver por empresa" icon="i-lucide-arrow-down" color="neutral" variant="outline" size="xs" @click="openExecutiveDetails(card.group)" />
              </div>
            </article>
          </div>

          <div class="flex flex-col gap-2 rounded-lg border border-default bg-default/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p class="text-sm font-medium text-highlighted">Resultado de caja</p><p class="text-xs text-muted">Entró − Salió en {{ currencyFilter }}. Es un flujo de caja, no una ganancia ni utilidad.</p></div>
            <p class="text-xl font-bold tabular-nums" :class="cashResultNegative ? 'text-warning' : 'text-success'">{{ centsToMoney(cashResultCents, currencyFilter) }}</p>
          </div>
          <p class="text-xs text-muted">Las variaciones comparan cobros y egresos del período contra los mismos días inmediatamente anteriores. Los saldos muestran el estado actual de los documentos, no una fotografía histórica.</p>

          <details ref="executiveDetails" class="scroll-mt-24 rounded-lg border border-default bg-default/10">
            <summary class="cursor-pointer list-none px-4 py-3 font-medium text-highlighted marker:hidden"><span class="inline-flex items-center gap-2"><UIcon name="i-lucide-list-collapse" class="size-4 text-primary" />Ver detalle por empresa</span><span class="ml-2 text-xs font-normal text-muted">{{ executiveRows.length }} filas · {{ currencyFilter }}</span></summary>
            <div class="flex flex-col gap-4 border-t border-default p-3 sm:p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-2">
                  <UButton v-for="group in executiveGroupOptions" :key="group.id" :label="group.label" :icon="group.icon" :color="executiveGroup === group.id ? 'primary' : 'neutral'" :variant="executiveGroup === group.id ? 'soft' : 'outline'" size="sm" :aria-pressed="executiveGroup === group.id" @click="executiveGroup = group.id" />
                </div>
                <span class="text-xs text-muted">Seleccioná un importe para abrir cuentas y documentos.</span>
              </div>
              <div class="min-w-0 overflow-x-auto">
                <AsteriskTable compact :storage-key="`financial-results-executive-${executiveGroup}`" :data="executiveRows" :columns="executiveGroupColumns" :get-row-id="(row: SummaryRow) => row.id" :filter-fields="[{ id: 'company_name', label: 'Empresa' }]" :sort-fields="[{ label: 'Empresa', value: 'company_name' }]" search-placeholder="Buscar empresa..." :table-min-width="executiveTableMinWidth" />
              </div>
              <UAlert v-if="executiveGroup === 'sales'" color="neutral" variant="subtle" icon="i-lucide-info" title="Saldo previo separado" description="El saldo inicial por cobrar se identifica aparte; no se presenta como venta del período." />
              <UAlert v-if="executiveGroup === 'purchases'" color="neutral" variant="subtle" icon="i-lucide-info" title="Compras: etapas y monedas" description="Facturado y pendiente corresponden a facturas emitidas durante el período y se expresan en moneda de factura. Pagado aplicado corresponde a aplicaciones hechas durante el período, en moneda de pago; puede incluir facturas anteriores. Son lecturas distintas y no se suman." />
              <UAlert v-if="executiveGroup === 'cash'" :color="outflowReconciliation.matches ? 'success' : 'error'" variant="subtle" :icon="outflowReconciliation.matches ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'" :title="outflowReconciliation.matches ? 'Egresos conciliados por empresa y moneda' : 'Hay egresos que no concilian'" :description="outflowReconciliation.matches ? 'Pagos asociados a facturas + otros pagos + gastos directos + vales y obligaciones coinciden con Salió.' : `Diferencias en: ${outflowReconciliation.mismatches.join(', ')}`" />
            </div>
          </details>
        </section>

        <section v-else class="rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-highlighted">Resumen por empresa y período</h2><UBadge color="primary" variant="subtle">{{ summary.companies.length }} empresas</UBadge></div>
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

           <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
             <p class="text-xs text-muted">Facturas reúne comprobantes fechados en el período; su pagado y pendiente son saldos actuales. Otros egresos son movimientos del período y excluyen pagos vinculados a facturas. Una factura parcial aparece en pagos y saldo; no sumes los subtotales al total facturado.</p>
             <UButton :label="egresosSeparados ? 'Unificar otros egresos' : 'Separar otros egresos'" :icon="egresosSeparados ? 'i-lucide-combine' : 'i-lucide-columns-3'" color="neutral" variant="outline" size="sm" :aria-pressed="egresosSeparados" @click="toggleOutflowsGrouping" />
          </div>
           <div class="mb-3 flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
             <span>Los importes de distintas monedas nunca se suman.</span>
          </div>
          <div class="min-w-0 overflow-x-auto">
            <AsteriskTable
              compact
              :key="egresosSeparados ? 'split-outflows' : 'combined-outflows'"
              storage-key="financial-results-company-summary"
              :data="summaryRows"
              :columns="summaryTableColumns"
              :filter-fields="[{ id: 'company_name', label: 'Empresa' }]"
              :sort-fields="[{ label: 'Empresa', value: 'company_name' }]"
              search-placeholder="Buscar empresa..."
              :table-min-width="egresosSeparados ? 2200 : 1800"
            />
          </div>
        </section>
      </template>

      <section v-if="activeDetail" ref="detailSection" class="flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/20 bg-elevated/20 p-4 sm:p-5" aria-live="polite">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-default pb-3">
          <div class="flex min-w-0 items-start gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon :name="metricIcons[activeDetail.metric]" class="size-4" /></span>
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-semibold text-highlighted">{{ activeDetail.company_name }} · {{ metricLabels[activeDetail.metric] }}</h2><UBadge color="neutral" variant="subtle">{{ detailCurrency }}</UBadge></div><p class="mt-1 text-sm text-muted">{{ activeDetail.metric === 'purchase_invoice_payments' ? 'Cada fila es una aplicación del período. El importe está en moneda del pago y podés abrir tanto el pago como la factura.' : 'Composición por cuenta contable y documentos que forman el importe.' }}</p></div>
          </div>
          <UButton label="Cerrar detalle" icon="i-lucide-x" color="neutral" variant="outline" size="sm" @click="closeDetail" />
        </div>

        <UAlert v-if="detailError" color="error" variant="soft" title="No se pudo cargar el subreporte" :description="detailError" icon="i-lucide-triangle-alert" />
        <div v-if="detailLoading && !detail" class="grid grid-cols-1 gap-3 sm:grid-cols-3"><USkeleton v-for="index in 3" :key="index" class="h-20 rounded-lg" /></div>

        <template v-if="detail">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default bg-default/30 px-3 py-2.5">
            <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span><span class="text-muted">Renglones:</span> <strong class="tabular-nums">{{ formatCount(detail.total_rows) }}</strong></span>
              <span><span class="text-muted">{{ detailRecordCountLabel }}:</span> <strong class="tabular-nums">{{ formatCount(detail.total_documents) }}</strong></span>
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
                <div><h3 class="font-semibold text-highlighted">Documentos y partidas</h3><p class="mt-1 text-xs text-muted">Las facturas muestran total, pagado, saldo y estado. Los importes aplicados son acumulados actuales; para pagos y gastos, cada fila corresponde a un movimiento del tipo seleccionado.</p></div>
                <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
               <UFormField v-if="hasPaymentStateFilter" :label="detailPaymentStateLabel" class="w-full sm:w-44"><USelect v-model="detailPaymentState" :items="detailPaymentStateOptions" value-key="value" class="w-full" /></UFormField>
                  <UInput v-model="detailSearch" icon="i-lucide-search" placeholder="Buscar número, UUID, tercero o concepto" class="w-full sm:w-80" />
                </div>
              </div>
              <div v-if="selectedComposition" class="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm"><UBadge color="primary" variant="subtle">Cuenta</UBadge><span class="font-medium">{{ selectedComposition.label }}</span><span v-if="selectedComposition.metric_type" class="text-muted">· {{ selectedComposition.metric_type }}</span></div>
               <UAlert v-if="['pending_orders', 'purchase_invoices_paid', 'purchase_invoices_pending', 'opening_balance_receivable'].includes(activeDetail.metric) && !detailAccountKey" class="mb-3" color="warning" variant="subtle" icon="i-lucide-info" title="Importe sin distribución por cuenta" :description="activeDetail.metric === 'opening_balance_receivable' ? 'El saldo inicial se muestra como importe pendiente del cliente y no se distribuye entre productos ni cuentas de ingreso.' : activeDetail.metric === 'purchase_invoices_paid' ? 'Es el paid_amount acumulado actual de cada factura. No se distribuye entre las cuentas de gasto de sus partidas ni representa solo pagos hechos en este período.' : activeDetail.metric === 'purchase_invoices_pending' ? 'El saldo se calcula como total de factura menos importe pagado. No se distribuye entre las cuentas de gasto de las partidas.' : 'El pendiente se calcula como total de la OV menos cobrado. No se reparte entre cuentas de ingreso.'" />
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
                  :table-min-width="hasPaymentStateFilter ? 1800 : 1300"
                  @update:page="onDetailPageChange"
                >
                  <template #expanded="{ row }">
                    <div class="border-t border-default bg-muted/20 px-3 py-3 sm:px-4">
                      <div class="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p class="text-sm font-semibold text-highlighted">Partidas de {{ row.original.document_label }} {{ row.original.document_reference }}</p><p class="text-xs text-muted">El detalle conserva las cuentas actuales del producto; los impuestos y ajustes sin imputación se muestran como diferencia.</p></div><UBadge color="neutral" variant="subtle">{{ expandedItems[row.original.id]?.items.length ?? 0 }} partidas</UBadge></div>
                      <div v-if="expandedItems[row.original.id] && ['sales_confirmed', 'pending_orders', 'purchase_invoices', 'purchase_invoices_pending', 'opening_balance_receivable'].includes(activeDetail.metric)" class="mb-3 flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-default px-3 py-2 text-xs tabular-nums">
                        <span>{{ activeDetail.metric === 'opening_balance_receivable' ? 'Saldo inicial' : invoiceMetrics.includes(activeDetail.metric) ? 'Total factura' : 'Total OV' }}: <strong>{{ formatMoney(expandedItems[row.original.id]?.document_total_amount ?? '0', row.original.currency_code) }}</strong></span>
                        <span>{{ invoiceMetrics.includes(activeDetail.metric) ? 'Pagado' : 'Cobrado' }}: <strong class="text-success">{{ formatMoney(expandedItems[row.original.id]?.paid_amount ?? '0', row.original.currency_code) }}</strong></span>
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
