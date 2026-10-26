<script setup lang="ts">
import { h } from 'vue'
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type { ConsolidatedReportCompanyOption, ConsolidatedReportResponse, ConsolidatedReportView, CurrencyTotals } from '~/modulos/erp/management-reports/consolidated-reports.types'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { reportTableFilter } from '~/modulos/erp/management-reports/report-table-filter'

definePageMeta({ middleware: ['auth', 'management-reports'] })

const service = useManagementReportsService()
const route = useRoute()
const toast = useToast()
const viewConfig: Record<ConsolidatedReportView, { title: string; description: string }> = {
  consolidated: { title: 'Reporte consolidado', description: 'Resumen integral de todas las áreas y empresas seleccionadas' },
  customers: { title: 'Reporte de clientes', description: 'Cobros, cuentas corrientes y documentación comercial' },
  suppliers: { title: 'Reporte de proveedores', description: 'Pagos, deuda, obligaciones y documentos de compra' },
  hr: { title: 'Reporte de empleados y socios', description: 'Personas, vales, retiros y saldos pendientes' },
  treasury: { title: 'Reporte de bancos, cajas y cheques', description: 'Saldos, aperturas, variaciones y movimientos financieros' },
  documents: { title: 'Reporte de documentos', description: 'Documentos de compra y venta agrupados por tipo y estado' },
  inventory: { title: 'Reporte de inventario y logística', description: 'Entradas, salidas y movimientos de productos' }
}
const reportView = computed<ConsolidatedReportView>(() => {
  const value = String(route.query.view ?? 'consolidated') as ConsolidatedReportView
  return value in viewConfig ? value : 'consolidated'
})
const currentView = computed(() => viewConfig[reportView.value])
useHead(() => ({ title: `${currentView.value.title} | AsteriskSuite` }))
const now = new Date()
const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const filters = reactive({ date_from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), date_to: isoDate(now) })
const companyDisplayMode = ref<'combined' | 'separate'>('combined')
const presentationMode = ref<'spreadsheet' | 'charts' | 'tables' | 'summary'>('spreadsheet')
const presentationModes = [
  { id: 'spreadsheet', label: 'Hoja de cálculo', icon: 'i-lucide-sheet', description: 'Vista comparativa tipo Excel con los indicadores de cada empresa.' },
  { id: 'charts', label: 'Gráficos', icon: 'i-lucide-chart-no-axes-column-increasing', description: 'Compará tendencias y cantidades entre empresas.' },
  { id: 'tables', label: 'Tablas', icon: 'i-lucide-table-2', description: 'Consultá el detalle por área con búsqueda, filtros y orden.' },
  { id: 'summary', label: 'Resumen', icon: 'i-lucide-layout-dashboard', description: 'Panorama global de todas las áreas y empresas del reporte.' },
] as const
type ReportSheet = 'summary' | ConsolidatedReportView
const activeSheet = ref<ReportSheet>(reportView.value === 'consolidated' ? 'summary' : reportView.value)
const reportSheets: Array<{ id: ReportSheet; label: string; icon: string }> = [
  { id: 'summary', label: 'General', icon: 'i-lucide-chart-no-axes-combined' },
  { id: 'customers', label: 'Clientes', icon: 'i-lucide-contact-round' },
  { id: 'suppliers', label: 'Proveedores', icon: 'i-lucide-truck' },
  { id: 'treasury', label: 'Tesorería', icon: 'i-lucide-landmark' },
  { id: 'hr', label: 'Personal', icon: 'i-lucide-users-round' },
  { id: 'documents', label: 'Documentos', icon: 'i-lucide-files' },
  { id: 'inventory', label: 'Inventario', icon: 'i-lucide-package' },
]
const visibleReportSheets = computed(() => reportView.value === 'consolidated'
  ? reportSheets.filter(sheet => sheet.id !== 'summary')
  : reportSheets.filter(sheet => sheet.id === reportView.value))
const showThemeTabs = computed(() => presentationMode.value === 'tables')
const tableMode = computed(() => presentationMode.value === 'tables' || (reportView.value !== 'consolidated' && presentationMode.value === 'spreadsheet'))
const summaryDetailsMode = computed(() => tableMode.value || presentationMode.value === 'summary')
const companies = ref<ConsolidatedReportCompanyOption[]>([])
const selectedCompanyIds = ref<string[]>([])
const report = ref<ConsolidatedReportResponse | null>(null)
const loading = ref(false)
const exporting = ref<'pdf' | 'xlsx' | 'csv' | null>(null)
const downloadOptions = [[
  { label: 'PDF', icon: 'i-lucide-file-text', onSelect: () => download('pdf') },
  { label: 'Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: () => download('xlsx') },
  { label: 'CSV', icon: 'i-lucide-file-down', onSelect: () => download('csv') },
]]
const metrics = [
  { key: 'sales', label: 'Ventas facturadas', icon: 'i-lucide-trending-up' },
  { key: 'purchases', label: 'Compras facturadas', icon: 'i-lucide-shopping-bag' },
  { key: 'collections', label: 'Cobros', icon: 'i-lucide-hand-coins' },
  { key: 'payments', label: 'Pagos', icon: 'i-lucide-credit-card' },
  { key: 'receivables', label: 'Por cobrar actual', icon: 'i-lucide-circle-dollar-sign' },
  { key: 'payables', label: 'Por pagar actual', icon: 'i-lucide-receipt-text' }
] as const
const summaryMetricCards = [
  ...metrics,
  { key: 'banks', label: 'Saldos bancarios', icon: 'i-lucide-landmark' },
  { key: 'cash', label: 'Saldos en caja', icon: 'i-lucide-wallet' },
  { key: 'pending_checks', label: 'Cheques pendientes', icon: 'i-lucide-notebook-pen' }
] as const
type WorkbookMetricKey = typeof summaryMetricCards[number]['key']
const chartMetric = ref<WorkbookMetricKey>('sales')
const chartCurrency = ref('ARS')
type ReportTableRow = Record<string, any> & { id: string }
const companyTones = [
  'bg-primary/10 text-primary ring-primary/20',
  'bg-info/10 text-info ring-info/20',
  'bg-success/10 text-success ring-success/20',
  'bg-warning/10 text-warning ring-warning/20',
  'bg-error/10 text-error ring-error/20',
  'bg-secondary/10 text-secondary ring-secondary/20',
]
const textColumn = (accessorKey: string, label: string): ExtendedColumn<ReportTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'text', operators: ['contains', 'equals'] } },
})
const numberColumn = (accessorKey: string, label: string): ExtendedColumn<ReportTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
})
const selectColumn = (accessorKey: string, label: string, values: string[]): ExtendedColumn<ReportTableRow> => ({
  accessorKey, header: label, filterFn: reportTableFilter, meta: { label, filter: { type: 'select', options: values.map(value => ({ label: value, value })) } },
})
const quickFilters = (...fields: Array<[string, string]>): FilterField[] => fields.map(([id, label]) => ({ id, label }))
const sortOptions = (...fields: Array<[string, string]>): SortField[] => fields.map(([label, value]) => ({ label, value }))
const withRowIds = (rows: Record<string, any>[], prefix: string): ReportTableRow[] => rows.map((row, index) => ({
  ...row,
  id: String(row.id ?? `${prefix}-${index}`),
}))
const companySummaryColumns: ExtendedColumn<ReportTableRow>[] = [
  textColumn('company_name', 'Empresa'), textColumn('subdomain', 'Base'),
  ...metrics.map(metric => textColumn(`${metric.key}_display`, metric.label)),
  textColumn('banks_display', 'Bancos'), textColumn('cash_display', 'Cajas'), textColumn('checks_display', 'Cheques pendientes'),
]
const partyColumns: ExtendedColumn<ReportTableRow>[] = [
  textColumn('role_label', 'Grupo'), numberColumn('total', 'Registrados'), numberColumn('active', 'Activos'),
  numberColumn('with_balance', 'Con saldo'), textColumn('balance_display', 'Saldo neto'),
]
const financialColumns: ExtendedColumn<ReportTableRow>[] = [
  selectColumn('type', 'Tipo', ['Banco', 'Caja']), textColumn('name', 'Cuenta'), textColumn('status', 'Estado'),
  numberColumn('movement_count', 'Movimientos'), textColumn('opening_display', 'Apertura'),
  textColumn('variation_display', 'Variación'), textColumn('balance_display', 'Saldo actual'),
]
const peopleColumns: ExtendedColumn<ReportTableRow>[] = [
  selectColumn('kind_label', 'Tipo', ['Empleado', 'Socio']), textColumn('name', 'Persona'), textColumn('active_label', 'Estado'),
  textColumn('detail', 'Datos'), numberColumn('movements_count', 'Movimientos'),
  textColumn('movements_display', 'Importe período'), textColumn('pending_display', 'Pendiente'),
]
const documentColumns: ExtendedColumn<ReportTableRow>[] = [
  selectColumn('direction_label', 'Circuito', ['Venta', 'Compra']), textColumn('category_label', 'Documento'),
  textColumn('status_label', 'Estado'), numberColumn('count', 'Cantidad'), textColumn('amount_display', 'Importe'),
]
const inventoryColumns: ExtendedColumn<ReportTableRow>[] = [
  textColumn('company_name', 'Empresa'), selectColumn('type_label', 'Tipo', ['Orden de venta', 'Factura']),
  numberColumn('document_number', 'Documento'), textColumn('document_date', 'Fecha'), textColumn('customer', 'Cliente'),
  textColumn('product', 'Artículo'), numberColumn('quantity', 'Cantidad'), textColumn('status', 'Estado'),
  textColumn('confirmation_display', 'Confirmación'), textColumn('user', 'Usuario'),
  textColumn('invoice_display', 'Total facturado'), textColumn('paid_display', 'Importe cobrado'),
]
const stockColumns: ExtendedColumn<ReportTableRow>[] = [
  textColumn('product', 'Producto'), textColumn('movement_type', 'Origen'), textColumn('direction', 'Movimiento'),
  numberColumn('quantity', 'Cantidad neta'), numberColumn('count', 'Movimientos'),
]
const detailColumns = (showBalance: boolean): ExtendedColumn<ReportTableRow>[] => [
  textColumn('label', 'Detalle'), numberColumn('count', 'Registros'), textColumn('amount_display', 'Importe'),
  ...(showBalance ? [textColumn('balance_display', 'Saldo')] : []),
]
const companyColumn: ExtendedColumn<ReportTableRow> = {
  accessorKey: 'company_name', header: 'Empresa',
  filterFn: reportTableFilter,
  meta: { label: 'Empresa', filter: { type: 'text', operators: ['contains', 'equals'] } },
  cell: ({ row }: any) => h('span', { class: `inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${row.original.company_tone}` }, row.original.company_name),
}
const withCompanyColumn = (columns: ExtendedColumn<ReportTableRow>[]) => [companyColumn, ...columns.filter(column => !('accessorKey' in column) || column.accessorKey !== 'company_name')]
function workbookCompanyTotals(company: ConsolidatedReportResponse['companies'][number], metric: WorkbookMetricKey): CurrencyTotals {
  return company[metric]
}
const workbookRows = computed<ReportTableRow[]>(() => {
  const companies = report.value?.companies ?? []
  return summaryMetricCards.flatMap((metric) => {
    const currencies = [...new Set(companies.flatMap(company => Object.keys(workbookCompanyTotals(company, metric.key))))].sort()
    return currencies.map((currency) => {
      const amounts = Object.fromEntries(companies.map(company => [company.company_id, workbookCompanyTotals(company, metric.key)[currency] ?? null]))
      const total = Object.values(amounts).reduce<number>((sum, amount) => sum + Number(amount ?? 0), 0)
      return {
        id: `${metric.key}-${currency}`,
        metric_key: metric.key,
        metric_label: metric.label,
        currency_code: currency,
        total,
        ...amounts,
      }
    })
  })
})
const workbookColumns = computed<ExtendedColumn<ReportTableRow>[]>(() => [
  { accessorKey: 'metric_label', header: 'Indicador', meta: { label: 'Indicador', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'currency_code', header: 'Moneda', meta: { label: 'Moneda', filter: { type: 'text', operators: ['equals'] } } },
  ...(report.value?.companies ?? []).map((company): ExtendedColumn<ReportTableRow> => ({
    accessorKey: company.company_id,
    header: company.company_name,
    cell: ({ row }: any) => h('span', { class: 'block min-w-28 text-right font-mono tabular-nums' }, row.original[company.company_id] == null ? '—' : formatAmount(row.original[company.company_id], row.original.currency_code)),
  })),
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }: any) => h('span', { class: 'block min-w-28 text-right font-semibold font-mono tabular-nums' }, formatAmount(row.original.total, row.original.currency_code)),
  },
])
const workbookConsolidatedTotals = computed<Record<WorkbookMetricKey, CurrencyTotals>>(() => Object.fromEntries(summaryMetricCards.map((metric) => {
  const totals: CurrencyTotals = {}
  for (const company of report.value?.companies ?? []) {
    for (const [currency, amount] of Object.entries(workbookCompanyTotals(company, metric.key))) totals[currency] = (totals[currency] ?? 0) + amount
  }
  return [metric.key, totals]
})))
const workbookCurrencies = computed(() => [...new Set(Object.values(workbookConsolidatedTotals.value).flatMap(totals => Object.keys(totals)))].sort())
const chartCurrencyOptions = computed(() => workbookCurrencies.value.map(currency => ({ label: currency, value: currency })))
watch(workbookCurrencies, (currencies) => {
  if (currencies.length && !currencies.includes(chartCurrency.value)) chartCurrency.value = currencies.includes('ARS') ? 'ARS' : currencies[0]!
})
const companySummaryRows = computed(() => (report.value?.companies ?? []).map(company => ({
  ...company,
  id: company.company_id,
  ...Object.fromEntries(metrics.map(metric => [`${metric.key}_display`, formatTotals(workbookCompanyTotals(company, metric.key))])),
  banks_display: formatTotals(workbookCompanyTotals(company, 'banks')),
  cash_display: formatTotals(workbookCompanyTotals(company, 'cash')),
  checks_display: formatTotals(workbookCompanyTotals(company, 'pending_checks')),
})))
const allSelected = computed(() => companies.value.length > 0 && selectedCompanyIds.value.length === companies.value.length)
const canGenerate = computed(() => selectedCompanyIds.value.length > 0 && filters.date_from <= filters.date_to)

function toggleCompany(id: string, selected: boolean | 'indeterminate') {
  selectedCompanyIds.value = selected === true ? [...new Set([...selectedCompanyIds.value, id])] : selectedCompanyIds.value.filter(item => item !== id)
  report.value = null
}
function toggleAll() {
  selectedCompanyIds.value = allSelected.value ? [] : companies.value.map(company => company.id)
  report.value = null
}
function formatTotals(totals?: CurrencyTotals) {
  const entries = Object.entries(totals ?? {})
  return entries.length ? entries.map(([currency, amount]) => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)).join(' · ') : '—'
}
function formatAmount(amount: number, currency: string) {
  return currency === 'UN' ? amount.toLocaleString('es-AR', { maximumFractionDigits: 3 }) : new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)
}
function formatConfirmation(value: string | null) {
  return value ? new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'No confirmada'
}
function documentStatusLabel(status: number, category?: string) {
  if (status === 5) return category === 'QUOTE' ? 'Convertido' : category === 'ORDER' ? 'Entregado' : 'Completado'
  if (status === 6) return category === 'QUOTE' ? 'Rechazado' : 'Anulado'
  return ({ 0: 'Borrador', 1: 'Pendiente', 2: 'Confirmado', 3: 'Anulado', 4: 'Parcialmente entregado', 7: 'Cerrado', 8: 'Cancelado' } as Record<number, string>)[status] ?? `Estado ${status}`
}
function documentCategoryLabel(category: string) {
  return ({ INVOICE: 'Factura', ORDER: 'Orden', REMITO: 'Remito', QUOTE: 'Presupuesto', CREDIT_NOTE: 'Nota de crédito', DEBIT_NOTE: 'Nota de débito', RECEIPT: 'Recibo' } as Record<string, string>)[category] ?? category
}
function partyRoleLabel(role: string) {
  return ({ CUSTOMER: 'Clientes', SUPPLIER: 'Proveedores', EMPLOYEE: 'Empleados', PARTNER: 'Socios', TAX_AUTHORITY: 'Entes impositivos', UTILITY: 'Servicios públicos', SERVICE_PROVIDER: 'Proveedores de servicios' } as Record<string, string>)[role] ?? role
}
const detailSections = [
  { key: 'collections_by_party', label: 'Cobros por cliente' },
  { key: 'payments_by_party', label: 'Pagos y gastos por tercero' },
  { key: 'customer_balances', label: 'Cuentas de clientes con saldo' },
  { key: 'supplier_balances', label: 'Cuentas de proveedores con saldo' },
  { key: 'obligations', label: 'Obligaciones del período' },
  { key: 'hr_vales', label: 'Empleados y socios' },
  { key: 'payment_statuses', label: 'Pagos y cobros por estado' },
  { key: 'checks', label: 'Cheques por estado' },
  { key: 'treasury_movements', label: 'Movimientos de tesorería por tipo' },
  { key: 'transfers', label: 'Transferencias' },
  { key: 'treasury_variation', label: 'Variación de caja y bancos' }
] as const
function showArea(area: ConsolidatedReportView) {
  return (reportView.value === 'consolidated' || reportView.value === area) && (presentationMode.value === 'summary' || activeSheet.value === area)
}
function showDetailSection(key: typeof detailSections[number]['key']) {
  const mapping: Record<typeof detailSections[number]['key'], ConsolidatedReportView> = {
    collections_by_party: 'customers', payments_by_party: 'suppliers', customer_balances: 'customers', supplier_balances: 'suppliers', obligations: 'suppliers',
    hr_vales: 'hr', payment_statuses: 'treasury', checks: 'treasury', treasury_movements: 'treasury', transfers: 'treasury', treasury_variation: 'treasury'
  }
  return showArea(mapping[key])
}
function visiblePartyRows(company: ConsolidatedReportResponse['companies'][number]) {
  if (reportView.value === 'customers') return company.details.party_summary.filter(row => row.role === 'CUSTOMER')
  if (reportView.value === 'suppliers') return company.details.party_summary.filter(row => row.role === 'SUPPLIER')
  return company.details.party_summary
}
function partyTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds(visiblePartyRows(company).map(row => ({
    ...row,
    role_label: partyRoleLabel(row.role),
    balance_display: formatAmount(row.balance, row.currency_code),
  })), `${company.company_id}-party`)
}
function financialTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds([
    ...company.details.bank_accounts.map(row => ({ ...row, type: 'Banco' })),
    ...company.details.cash_boxes.map(row => ({ ...row, type: 'Caja' })),
  ].map(row => ({
    ...row,
    opening_display: formatAmount(row.opening_amount, row.currency_code),
    variation_display: formatAmount(row.period_change, row.currency_code),
    balance_display: formatAmount(row.current_balance, row.currency_code),
    status: `${row.status} · ${row.currency_code}`,
    name: row.institution ? `${row.name} · ${row.institution}` : row.name,
  })), `${company.company_id}-financial`)
}
function peopleTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds([...company.details.employees, ...company.details.partners].map(row => ({
    ...row,
    kind_label: row.kind === 'EMPLOYEE' ? 'Empleado' : 'Socio',
    active_label: row.active ? 'Activo' : 'Inactivo',
    movements_display: formatAmount(row.movements_amount, row.currency_code),
    pending_display: formatAmount(row.pending_amount, row.currency_code),
  })), `${company.company_id}-people`)
}
function documentTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds(company.details.documents.map(row => ({
    ...row,
    direction_label: row.direction === 'SALE' ? 'Venta' : 'Compra',
    category_label: documentCategoryLabel(row.category),
    status_label: documentStatusLabel(row.status, row.category),
    amount_display: formatAmount(row.amount, row.currency_code),
  })), `${company.company_id}-documents`)
}
function inventoryTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds(company.details.inventory_orders.map(row => ({
    ...row,
    company_name: company.company_name,
    type_label: row.document_type === 'ORDER' ? 'Orden de venta' : 'Factura',
    confirmation_display: formatConfirmation(row.confirmation_at),
    invoice_display: row.invoice_total == null ? '—' : formatAmount(row.invoice_total, row.currency_code),
    paid_display: row.paid_amount == null ? '—' : formatAmount(row.paid_amount, row.currency_code),
  })), `${company.company_id}-inventory`)
}
function stockTableRows(company: ConsolidatedReportResponse['companies'][number]): ReportTableRow[] {
  return withRowIds(company.details.stock_movements.map(row => ({
    ...row,
    direction: row.direction === 'IN' ? 'Entrada' : row.direction === 'OUT' ? 'Salida' : row.direction,
  })), `${company.company_id}-stock`)
}
function detailTableRows(company: ConsolidatedReportResponse['companies'][number], key: typeof detailSections[number]['key']): ReportTableRow[] {
  const rows = company.details[key] as Array<{ label: string; currency_code: string; amount: number; count: number; balance?: number }>
  return withRowIds(rows.map(row => ({
    ...row,
    amount_display: formatAmount(row.amount, row.currency_code),
    balance_display: row.balance == null ? '' : formatAmount(row.balance, row.currency_code),
  })), `${company.company_id}-${key}`)
}
function combineCompanyRows(buildRows: (company: ConsolidatedReportResponse['companies'][number]) => ReportTableRow[]): ReportTableRow[] {
  return (report.value?.companies ?? []).flatMap((company, companyIndex) => buildRows(company).map(row => ({
    ...row,
    id: `${company.company_id}-${row.id}`,
    company_id: company.company_id,
    company_name: company.company_name,
    company_tone: companyTones[companyIndex % companyTones.length],
  })))
}
const combinedPartyRows = computed(() => combineCompanyRows(partyTableRows))
const combinedFinancialRows = computed(() => combineCompanyRows(financialTableRows))
const combinedPeopleRows = computed(() => combineCompanyRows(peopleTableRows))
const combinedDocumentRows = computed(() => combineCompanyRows(documentTableRows))
const combinedInventoryRows = computed(() => combineCompanyRows(inventoryTableRows))
const combinedStockRows = computed(() => combineCompanyRows(stockTableRows))
const combinedDetailRows = (key: typeof detailSections[number]['key']) => combineCompanyRows(company => detailTableRows(company, key))
const combinedAlertRows = computed(() => (report.value?.companies ?? []).flatMap((company, companyIndex) => company.details.alerts.map((alert, index) => ({
  id: `${company.company_id}-alert-${index}`, company_name: company.company_name, company_tone: companyTones[companyIndex % companyTones.length], alert,
}))))
const combinedNarrativeRows = computed(() => (report.value?.companies ?? []).flatMap((company, companyIndex) => visibleNarratives(company).map((narrative, index) => ({
  id: `${company.company_id}-narrative-${index}`, company_name: company.company_name, company_tone: companyTones[companyIndex % companyTones.length], narrative,
}))))
const chartMetricOptions = summaryMetricCards.map(metric => ({ label: metric.label, value: metric.key }))
const selectedChartMetric = computed(() => summaryMetricCards.find(metric => metric.key === chartMetric.value)?.label ?? 'Indicador')
const chartMetricValues = computed(() => (report.value?.companies ?? []).map(company => ({
  name: company.company_name,
  value: Number(workbookCompanyTotals(company, chartMetric.value)[chartCurrency.value] ?? 0),
})))
const reportChartOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value: number) => formatAmount(value, chartCurrency.value) },
  grid: { left: 24, right: 24, top: 24, bottom: 55, containLabel: true },
  xAxis: { type: 'category', data: chartMetricValues.value.map(item => item.name), axisLabel: { interval: 0, rotate: chartMetricValues.value.length > 4 ? 20 : 0 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  series: [{ name: selectedChartMetric.value, type: 'bar', data: chartMetricValues.value.map(item => item.value), barMaxWidth: 48, emphasis: { focus: 'series' } }],
}))
const compositionChartOption = computed<any>(() => ({
  tooltip: { trigger: 'item', valueFormatter: (value: number) => formatAmount(value, chartCurrency.value) },
  legend: { bottom: 0, type: 'scroll' },
  series: [{
    name: selectedChartMetric.value,
    type: 'pie',
    radius: ['42%', '72%'],
    center: ['50%', '45%'],
    avoidLabelOverlap: true,
    data: chartMetricValues.value.filter(item => item.value > 0),
    label: { formatter: '{b}: {d}%' },
  }],
}))
const indicatorChartOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value: number) => formatAmount(value, chartCurrency.value) },
  grid: { left: 24, right: 24, top: 20, bottom: 90, containLabel: true },
  xAxis: { type: 'category', data: summaryMetricCards.map(metric => metric.label), axisLabel: { interval: 0, rotate: 25 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  series: [{
    name: chartCurrency.value,
    type: 'bar',
    data: summaryMetricCards.map(metric => Number(workbookConsolidatedTotals.value[metric.key]?.[chartCurrency.value] ?? 0)),
    barMaxWidth: 42,
  }],
}))
const hasReportChartData = computed(() => summaryMetricCards.some(metric => Number(workbookConsolidatedTotals.value[metric.key]?.[chartCurrency.value] ?? 0) !== 0))
const hasCompositionData = computed(() => chartMetricValues.value.some(item => item.value > 0))
const alertColumns: ExtendedColumn<ReportTableRow>[] = [companyColumn, textColumn('alert', 'Seguimiento')]
const narrativeColumns: ExtendedColumn<ReportTableRow>[] = [companyColumn, textColumn('narrative', 'Resumen')]
function visibleNarratives(company: ConsolidatedReportResponse['companies'][number]) {
  const indexes: Record<ConsolidatedReportView, number[]> = {
    consolidated: [0, 1, 2, 3, 4], customers: [0, 1, 4], suppliers: [0, 1, 4], hr: [3, 4], treasury: [2, 4], documents: [0, 4], inventory: [4]
  }
  return indexes[reportView.value].map(index => company.details.narratives[index]).filter((value): value is string => Boolean(value))
}
async function generateReport() {
  if (!canGenerate.value) return
  presentationMode.value = reportView.value === 'consolidated' ? 'spreadsheet' : 'tables'
  activeSheet.value = reportView.value === 'consolidated' ? 'summary' : reportView.value
  loading.value = true
  try {
    report.value = await service.getConsolidatedReport({ ...filters, company_ids: selectedCompanyIds.value, view: reportView.value })
  } catch (error: any) {
    toast.add({ title: 'No se pudo generar el reporte', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { loading.value = false }
}
async function download(format: 'pdf' | 'xlsx' | 'csv') {
  if (!canGenerate.value) return
  exporting.value = format
  try {
    const blob = await service.exportConsolidatedReport({ ...filters, company_ids: selectedCompanyIds.value, view: reportView.value, format })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte-${reportView.value}-${filters.date_from}-${filters.date_to}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error: any) {
    toast.add({ title: `No se pudo descargar el ${format.toUpperCase()}`, description: error?.data?.message ?? error.message, color: 'error' })
  } finally { exporting.value = null }
}
onMounted(async () => {
  try {
    companies.value = await service.getConsolidatedCompanies()
    selectedCompanyIds.value = companies.value.map(company => company.id)
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar tus empresas', description: error?.data?.message ?? error.message, color: 'error' })
  }
})
watch(reportView, (view) => {
  activeSheet.value = view === 'consolidated' ? 'summary' : view
  presentationMode.value = view === 'consolidated' ? 'spreadsheet' : 'tables'
  report.value = null
})
watch(presentationMode, (mode) => {
  if (mode === 'tables' && activeSheet.value === 'summary') activeSheet.value = 'customers'
})
</script>

<template>
  <UPage class="mx-auto !block w-0 min-w-full max-w-full overflow-x-clip px-4 pb-10 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-8">
    <AppPageHeader :title="currentView.title" :description="currentView.description" />

    <UPageCard variant="subtle" class="overflow-hidden border-primary/15 shadow-sm">
      <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-sliders-horizontal" class="size-4" /></span>
          <div><p class="font-semibold">Prepará tu reporte</p><p class="text-xs text-muted">Empresas, período y presentación.</p></div>
        </div>
        <span class="rounded-full bg-elevated px-2.5 py-1 text-xs font-medium text-muted">{{ selectedCompanyIds.length }} de {{ companies.length }} empresas</span>
      </div>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-2">
          <div><h2 class="text-sm font-semibold">1. Empresas</h2><p class="text-xs text-muted">Empresas asociadas a tu usuario.</p></div>
          <UButton :label="allSelected ? 'Quitar todas' : 'Seleccionar todas'" :icon="allSelected ? 'i-lucide-circle-minus' : 'i-lucide-check-check'" color="neutral" variant="outline" size="sm" @click="toggleAll" />
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label v-for="company in companies" :key="company.id" :class="['flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors hover:border-primary/30', selectedCompanyIds.includes(company.id) ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/15' : 'border-default bg-elevated/20']">
            <UCheckbox :model-value="selectedCompanyIds.includes(company.id)" @update:model-value="toggleCompany(company.id, $event)" />
            <span class="flex min-w-0 flex-1 items-center gap-2">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted"><UIcon name="i-lucide-building-2" class="size-4" /></span>
              <span class="min-w-0"><span class="block truncate text-sm font-medium">{{ company.name }}</span><span class="block truncate text-[11px] text-muted">{{ company.subdomain }} <span aria-hidden="true">·</span> {{ company.role }}</span></span>
            </span>
            <UIcon v-if="selectedCompanyIds.includes(company.id)" name="i-lucide-check-circle-2" class="size-4 shrink-0 text-primary" />
          </label>
        </div>
      </section>

      <section class="grid gap-3 rounded-xl border border-default bg-elevated/20 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <h2 class="pb-1 text-sm font-semibold">2. Período</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" size="md" class="w-full" @update:model-value="report = null" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" size="md" class="w-full" @update:model-value="report = null" /></UFormField>
        </div>
      </section>

      <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default p-3">
        <div class="min-w-0"><h2 class="text-sm font-semibold">3. Presentación</h2><p class="text-xs text-muted">{{ companyDisplayMode === 'combined' ? 'Tablas agrupadas e identificadas por empresa.' : 'Tablas separadas por empresa.' }}</p></div>
        <div class="flex w-full gap-2 sm:w-auto">
          <UButton label="Juntas" icon="i-lucide-layers-2" class="flex-1 sm:flex-none" :color="companyDisplayMode === 'combined' ? 'primary' : 'neutral'" :variant="companyDisplayMode === 'combined' ? 'solid' : 'outline'" @click="companyDisplayMode = 'combined'" />
          <UButton label="Por empresa" icon="i-lucide-building-2" class="flex-1 sm:flex-none" :color="companyDisplayMode === 'separate' ? 'primary' : 'neutral'" :variant="companyDisplayMode === 'separate' ? 'solid' : 'outline'" @click="companyDisplayMode = 'separate'" />
        </div>
      </section>

      <div class="flex flex-col gap-3 border-t border-default pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-xs">
          <p v-if="filters.date_from > filters.date_to" class="font-medium text-error">La fecha inicial no puede ser posterior a la fecha final.</p>
          <p v-else-if="!selectedCompanyIds.length" class="text-muted">Seleccioná al menos una empresa para continuar.</p>
          <p v-else class="text-muted">Se incluirán {{ selectedCompanyIds.length }} {{ selectedCompanyIds.length === 1 ? 'empresa' : 'empresas' }} entre {{ filters.date_from }} y {{ filters.date_to }}.</p>
        </div>
        <UButton label="Generar reporte" icon="i-lucide-file-chart-column" class="w-full justify-center sm:w-auto" :loading="loading" :disabled="!canGenerate" @click="generateReport" />
      </div>
      <UAlert v-if="!companies.length" color="warning" icon="i-lucide-building-2" title="No hay empresas disponibles" description="Tu usuario no tiene empresas asociadas para consolidar." />
      </div>
    </UPageCard>

    <div v-if="loading && !report" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><USkeleton v-for="item in 6" :key="item" class="h-32 rounded-xl" /></div>
      <div v-if="report" :class="['flex flex-col gap-6', reportView === 'consolidated' && presentationMode === 'spreadsheet' ? 'report-spreadsheet-mode' : '']">
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-default bg-elevated/25 p-5 sm:p-6">
        <div><p class="font-semibold">2. Resultado</p><p class="text-sm text-muted">{{ report.companies.length }} empresas · {{ report.period.from }} al {{ report.period.to }}</p></div>
        <UDropdownMenu :items="downloadOptions" :content="{ align: 'end' }">
          <UButton label="Descargar" icon="i-lucide-download" trailing-icon="i-lucide-chevron-down" color="neutral" variant="outline" size="lg" :loading="!!exporting" />
        </UDropdownMenu>
      </div>
      <div v-if="reportView === 'consolidated'" class="overflow-hidden rounded-2xl border border-default bg-elevated/20">
        <div class="flex min-w-max gap-2 overflow-x-auto p-2" role="tablist" aria-label="Modo de visualización">
          <UButton v-for="mode in presentationModes" :key="mode.id" :label="mode.label" :icon="mode.icon" role="tab" :aria-selected="presentationMode === mode.id" :color="presentationMode === mode.id ? 'primary' : 'neutral'" :variant="presentationMode === mode.id ? 'solid' : 'ghost'" @click="presentationMode = mode.id" />
        </div>
        <div class="border-t border-default px-4 py-3 text-sm text-muted">
          {{ presentationModes.find(mode => mode.id === presentationMode)?.description }}
        </div>
      </div>
      <div v-if="reportView === 'consolidated' && showThemeTabs" class="overflow-hidden rounded-xl border border-default bg-elevated/10">
        <div class="flex min-w-max gap-1 overflow-x-auto p-2" role="tablist" aria-label="Secciones del reporte">
          <UButton v-for="sheet in visibleReportSheets" :key="sheet.id" :label="sheet.label" :icon="sheet.icon" role="tab" :aria-selected="activeSheet === sheet.id" :color="activeSheet === sheet.id ? 'primary' : 'neutral'" :variant="activeSheet === sheet.id ? 'solid' : 'ghost'" @click="activeSheet = sheet.id" />
        </div>
        <div class="border-t border-default px-4 py-3 text-sm text-muted">
          {{ presentationMode === 'charts' && activeSheet === 'summary' ? 'Comparación general de indicadores por empresa.' : `Área: ${reportSheets.find(sheet => sheet.id === activeSheet)?.label}. Consultá y filtrá sus registros.` }}
        </div>
      </div>
      <section v-if="reportView === 'consolidated' && presentationMode === 'charts'" class="flex flex-col gap-5">
        <div class="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-default bg-elevated/20 p-4">
          <div><h2 class="font-semibold">Panel de gráficos</h2><p class="text-sm text-muted">Compará importes por empresa, composición e indicadores globales sin mezclar monedas.</p></div>
          <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <UFormField label="Indicador" class="w-full sm:w-60">
              <USelect v-model="chartMetric" :items="chartMetricOptions" value-key="value" class="w-full" />
            </UFormField>
            <UFormField label="Moneda" class="w-full sm:w-36">
              <USelect v-model="chartCurrency" :items="chartCurrencyOptions" value-key="value" class="w-full" />
            </UFormField>
          </div>
        </div>
        <div v-if="hasReportChartData" class="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <UPageCard variant="subtle" class="min-w-0"><template #header><div><p class="font-semibold">{{ selectedChartMetric }} por empresa</p><p class="text-xs text-muted">Comparación en {{ chartCurrency }}.</p></div></template><div class="h-[340px] min-w-0"><ClientOnly><VChart :option="reportChartOption" autoresize /></ClientOnly></div></UPageCard>
          <UPageCard variant="subtle" class="min-w-0"><template #header><div><p class="font-semibold">Participación por empresa</p><p class="text-xs text-muted">Distribución de importes positivos del indicador seleccionado.</p></div></template><div v-if="hasCompositionData" class="h-[340px] min-w-0"><ClientOnly><VChart :option="compositionChartOption" autoresize /></ClientOnly></div><UAlert v-else color="neutral" variant="subtle" title="Sin importes positivos" description="No hay valores positivos para componer este gráfico circular." /></UPageCard>
          <UPageCard variant="subtle" class="min-w-0 xl:col-span-2"><template #header><div><p class="font-semibold">Indicadores globales</p><p class="text-xs text-muted">Totales de todas las empresas en {{ chartCurrency }}.</p></div></template><div class="h-[360px] min-w-0"><ClientOnly><VChart :option="indicatorChartOption" autoresize /></ClientOnly></div></UPageCard>
        </div>
        <UAlert v-else color="neutral" variant="subtle" icon="i-lucide-chart-no-axes-column-increasing" title="No hay datos para graficar" description="No hay importes para la moneda seleccionada." />
      </section>
      <section v-if="reportView === 'consolidated' && presentationMode === 'summary'" class="flex flex-col gap-4">
        <div><h2 class="text-lg font-semibold">Resumen integral</h2><p class="text-sm text-muted">Indicadores globales de todas las empresas y áreas incluidas en este reporte.</p></div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <UPageCard v-for="metric in summaryMetricCards" :key="metric.key" variant="subtle"><div class="flex items-start gap-3"><div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon :name="metric.icon" class="size-5" /></div><div><p class="text-sm text-muted">{{ metric.label }}</p><p class="mt-1 text-xl font-bold">{{ formatTotals(workbookConsolidatedTotals[metric.key]) }}</p></div></div></UPageCard>
        </div>
      </section>
      <UAlert color="info" icon="i-lucide-info" title="Criterio del reporte" :description="report.currency_note + ' Los saldos financieros son actuales; ventas, compras, pagos y cobros corresponden al período.'" />
      <UPageCard v-if="reportView === 'consolidated' && presentationMode === 'spreadsheet'" variant="subtle" class="overflow-hidden">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div><p class="font-semibold">Hoja de cálculo · consulta</p><p class="text-xs text-muted">Grilla de sólo lectura con los datos originales del reporte, organizada como una planilla.</p></div>
            <span class="rounded-md border border-default bg-elevated/40 px-2.5 py-1 text-xs text-muted">{{ report.period.from }} — {{ report.period.to }}</span>
          </div>
        </template>
        <div class="report-formula-bar mb-2 flex min-w-0 items-center overflow-hidden rounded-t-lg border border-default bg-elevated/30 text-sm">
          <span class="border-r border-default px-3 py-2 font-mono text-xs text-muted">A1</span>
          <span class="border-r border-default px-3 py-2 font-serif italic text-muted">fx</span>
          <span class="truncate px-3 py-2 font-mono text-muted">Vista de consulta · datos originales del reporte</span>
        </div>
        <AsteriskTable
          compact
          :table-min-width="1280"
          :page-size="100"
          storage-key="management-report-company-spreadsheet"
          :data="workbookRows"
          :columns="workbookColumns"
          :filter-fields="quickFilters(['metric_label', 'Indicador'], ['currency_code', 'Moneda'])"
          :sort-fields="sortOptions(['Indicador', 'metric_label'], ['Moneda', 'currency_code'])"
          search-placeholder="Buscar indicador o moneda..."
        />
        <p class="mt-2 text-xs text-muted">Vista de sólo lectura. Los datos provienen de la consulta y no se pueden editar desde el reporte.</p>
      </UPageCard>
      <UPageCard v-if="reportView === 'consolidated' && presentationMode === 'summary'" variant="subtle" class="overflow-hidden">
        <template #header><div><p class="font-semibold">Comparativo por empresa</p><p class="text-xs text-muted">Los importes en moneda extranjera permanecen separados.</p></div></template>
        <div class="max-w-full overflow-x-auto">
          <AsteriskTable
            compact
            storage-key="management-report-company-summary"
            :data="companySummaryRows"
            :columns="companySummaryColumns"
            :filter-fields="quickFilters(['company_name', 'Empresa'], ['subdomain', 'Base'])"
            :sort-fields="sortOptions(['Empresa', 'company_name'])"
            search-placeholder="Buscar empresa..."
          />
        </div>
      </UPageCard>

      <div v-if="companyDisplayMode === 'combined' && presentationMode !== 'charts' && presentationMode !== 'spreadsheet' && (presentationMode === 'summary' || activeSheet !== 'summary')" class="flex min-w-0 max-w-full flex-col gap-7 overflow-x-clip">
        <div v-if="tableMode"><p class="text-lg font-semibold">{{ `Detalle de ${reportSheets.find(sheet => sheet.id === activeSheet)?.label.toLowerCase()}` }}</p><p class="text-sm text-muted">Tablas de detalle del área seleccionada; podés buscar, filtrar y ordenar los registros.</p></div>
        <div v-if="presentationMode === 'summary'"><p class="text-lg font-semibold">Detalle integral de todas las áreas</p><p class="text-sm text-muted">Tablas, totales y registros de todas las empresas incluidas en el reporte.</p></div>

        <UPageCard v-if="presentationMode === 'summary' && combinedAlertRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Prioridades de seguimiento</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-alerts" :data="combinedAlertRows" :columns="alertColumns" :filter-fields="quickFilters(['company_name', 'Empresa'], ['alert', 'Alerta'])" :sort-fields="sortOptions(['Empresa', 'company_name'])" search-placeholder="Buscar alerta o empresa..." /></UPageCard>
        <UPageCard v-if="presentationMode === 'summary' && combinedNarrativeRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Lectura ejecutiva</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-narratives" :data="combinedNarrativeRows" :columns="narrativeColumns" :filter-fields="quickFilters(['company_name', 'Empresa'], ['narrative', 'Resumen'])" :sort-fields="sortOptions(['Empresa', 'company_name'])" search-placeholder="Buscar resumen o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && (showArea('customers') || showArea('suppliers'))" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Partes interesadas y cuentas corrientes</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-parties" :data="combinedPartyRows" :columns="withCompanyColumn(partyColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['role_label', 'Grupo'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Grupo', 'role_label'])" search-placeholder="Buscar grupo o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && showArea('treasury')" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><div><p class="font-semibold">Bancos y cajas</p><p class="text-xs text-muted">Los saldos de distintas empresas y monedas se conservan por separado.</p></div></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-treasury" :data="combinedFinancialRows" :columns="withCompanyColumn(financialColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['type', 'Tipo'], ['name', 'Cuenta'], ['status', 'Estado'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Cuenta', 'name'])" search-placeholder="Buscar banco, caja o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && showArea('hr')" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Empleados y socios</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-people" :data="combinedPeopleRows" :columns="withCompanyColumn(peopleColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['name', 'Persona'], ['kind_label', 'Tipo'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Persona', 'name'])" search-placeholder="Buscar persona o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && showArea('documents') && combinedDocumentRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Documentos de venta y compra</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-documents" :data="combinedDocumentRows" :columns="withCompanyColumn(documentColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['direction_label', 'Circuito'], ['category_label', 'Documento'], ['status_label', 'Estado'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Documento', 'category_label'])" search-placeholder="Buscar documento o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && showArea('inventory') && combinedInventoryRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><div><p class="font-semibold">Documentos de venta por artículo</p><p class="text-xs text-muted">Incluye órdenes y facturas asociadas, sin duplicar importes.</p></div></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-inventory" :data="combinedInventoryRows" :columns="withCompanyColumn(inventoryColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['type_label', 'Tipo'], ['customer', 'Cliente'], ['product', 'Artículo'], ['user', 'Usuario'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Fecha', 'document_date'], ['Artículo', 'product'])" search-placeholder="Buscar artículo, cliente o empresa..." /></UPageCard>
        <UPageCard v-if="summaryDetailsMode && showArea('inventory') && combinedStockRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Movimientos de stock</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-stock" :data="combinedStockRows" :columns="withCompanyColumn(stockColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['product', 'Producto'], ['movement_type', 'Origen'], ['direction', 'Movimiento'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Producto', 'product'])" search-placeholder="Buscar producto o empresa..." /></UPageCard>
        <UPageCard v-for="section in detailSections.filter(item => summaryDetailsMode && showDetailSection(item.key))" :key="`combined-${section.key}`" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">{{ section.label }}</p></template><AsteriskTable compact class="min-w-0 max-w-full" :storage-key="`report-combined-${section.key}`" :data="combinedDetailRows(section.key)" :columns="withCompanyColumn(detailColumns(['customer_balances', 'supplier_balances'].includes(section.key)))" :filter-fields="quickFilters(['company_name', 'Empresa'], ['label', 'Detalle'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Detalle', 'label'])" search-placeholder="Buscar detalle o empresa..." /></UPageCard>
      </div>

      <div v-else-if="companyDisplayMode === 'separate' && presentationMode !== 'charts' && presentationMode !== 'spreadsheet' && (presentationMode === 'summary' || activeSheet !== 'summary')" class="flex flex-col gap-5">
        <div><p class="text-lg font-semibold">{{ presentationMode === 'summary' ? 'Resumen y detalle integral por empresa' : activeSheet === 'summary' ? 'Resumen por empresa' : `Detalle de ${reportSheets.find(sheet => sheet.id === activeSheet)?.label.toLowerCase()} por empresa` }}</p><p class="text-sm text-muted">{{ presentationMode === 'summary' ? 'Indicadores, alertas y todas las tablas disponibles de cada área.' : 'Cada empresa se presenta por separado para facilitar la revisión.' }}</p></div>
        <UPageCard v-for="company in report.companies" :key="`detail-${company.company_id}`" variant="subtle" class="w-0 min-w-full max-w-full overflow-x-clip">
          <template #header><div><p class="text-lg font-semibold">{{ company.company_name }}</p><p class="text-xs text-muted">Movimientos del período y saldos actuales</p></div></template>
          <div class="min-w-0 max-w-full space-y-6 overflow-x-clip">
            <UAlert v-if="presentationMode === 'summary' && company.details.alerts.length" color="warning" icon="i-lucide-triangle-alert" title="Prioridades de seguimiento">
              <template #description><ul class="mt-1 list-disc space-y-1 pl-5"><li v-for="alert in company.details.alerts" :key="alert">{{ alert }}</li></ul></template>
            </UAlert>

            <section v-if="presentationMode === 'summary'" class="rounded-xl border border-default bg-elevated/20 p-4">
              <p class="mb-2 font-semibold">Lectura ejecutiva</p>
              <ul class="list-disc space-y-2 pl-5 text-sm text-muted"><li v-for="text in visibleNarratives(company)" :key="text">{{ text }}</li></ul>
            </section>

            <section v-if="summaryDetailsMode && (showArea('customers') || showArea('suppliers'))">
              <p class="mb-2 font-semibold">Partes interesadas y cuentas corrientes</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-parties`" :data="partyTableRows(company)" :columns="partyColumns" :filter-fields="quickFilters(['role_label', 'Grupo'])" :sort-fields="sortOptions(['Grupo', 'role_label'], ['Saldo neto', 'balance_display'])" search-placeholder="Buscar grupo..." /></div>
            </section>

            <section v-if="summaryDetailsMode && showArea('treasury')">
              <p class="mb-2 font-semibold">Bancos y cajas</p>
              <p class="mb-3 text-sm text-muted">El saldo es el valor actual. La variación excluye aperturas y corresponde únicamente al período seleccionado.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-treasury-accounts`" :data="financialTableRows(company)" :columns="financialColumns" :filter-fields="quickFilters(['type', 'Tipo'], ['name', 'Cuenta'], ['status', 'Estado'])" :sort-fields="sortOptions(['Cuenta', 'name'], ['Saldo actual', 'balance_display'])" search-placeholder="Buscar banco o caja..." /></div>
            </section>

            <section v-if="summaryDetailsMode && showArea('hr')">
              <p class="mb-2 font-semibold">Empleados y socios</p>
              <p class="mb-3 text-sm text-muted">Los movimientos muestran vales y retiros del período. Los pendientes se presentan separados de los importes ya registrados.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-people`" :data="peopleTableRows(company)" :columns="peopleColumns" :filter-fields="quickFilters(['name', 'Persona'], ['kind_label', 'Tipo'], ['detail', 'Datos'])" :sort-fields="sortOptions(['Persona', 'name'], ['Tipo', 'kind_label'])" search-placeholder="Buscar persona..." /></div>
            </section>

            <section v-if="summaryDetailsMode && showArea('documents')">
              <p class="mb-2 font-semibold">Documentos de venta y compra</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-documents`" :data="documentTableRows(company)" :columns="documentColumns" :filter-fields="quickFilters(['direction_label', 'Circuito'], ['category_label', 'Documento'], ['status_label', 'Estado'])" :sort-fields="sortOptions(['Documento', 'category_label'], ['Cantidad', 'count'])" search-placeholder="Buscar documento..." /></div>
            </section>

            <section v-if="summaryDetailsMode && showArea('inventory')" class="min-w-0 max-w-full overflow-hidden">
              <p class="mb-2 font-semibold">Documentos de venta por artículo</p>
              <p class="mb-3 text-sm text-muted">Incluye órdenes de venta con sus facturas asociadas y facturas directas cuando la empresa no utiliza OV. Los importes se muestran una sola vez por documento.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-inventory-documents`" :data="inventoryTableRows(company)" :columns="inventoryColumns" :filter-fields="quickFilters(['type_label', 'Tipo'], ['customer', 'Cliente'], ['product', 'Artículo'], ['user', 'Usuario'])" :sort-fields="sortOptions(['Fecha', 'document_date'], ['Documento', 'document_number'], ['Artículo', 'product'])" search-placeholder="Buscar artículo, cliente o documento..." /></div>
            </section>

            <section v-if="summaryDetailsMode && showArea('inventory')">
              <p class="mb-2 font-semibold">Movimientos de stock</p>
              <p class="mb-3 text-sm text-muted">Las entradas se muestran positivas y las salidas negativas. “Movimientos” indica cuántos registros forman la cantidad neta.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-stock-movements`" :data="stockTableRows(company)" :columns="stockColumns" :filter-fields="quickFilters(['product', 'Producto'], ['movement_type', 'Origen'], ['direction', 'Movimiento'])" :sort-fields="sortOptions(['Producto', 'product'], ['Cantidad neta', 'quantity'])" search-placeholder="Buscar producto..." /></div>
            </section>

            <section v-for="section in detailSections" :key="section.key" v-show="summaryDetailsMode && showDetailSection(section.key)">
              <p class="mb-2 font-semibold">{{ section.label }}</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-${section.key}`" :data="detailTableRows(company, section.key)" :columns="detailColumns(['customer_balances', 'supplier_balances'].includes(section.key))" :filter-fields="quickFilters(['label', 'Detalle'])" :sort-fields="sortOptions(['Detalle', 'label'], ['Registros', 'count'])" search-placeholder="Buscar detalle..." /></div>
            </section>
          </div>
        </UPageCard>
      </div>
    </div>
    </div>
  </UPage>
</template>

<style scoped>
.report-spreadsheet-mode :deep(table) {
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.report-spreadsheet-mode :deep(thead tr) {
  background: var(--ui-bg-elevated);
}

.report-spreadsheet-mode :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid var(--ui-border);
  border-right-width: 0;
  padding: 0.625rem 0.75rem;
  white-space: nowrap;
}

.report-spreadsheet-mode :deep(thead th:last-child),
.report-spreadsheet-mode :deep(tbody td:last-child) {
  border-right-width: 1px;
}

.report-spreadsheet-mode :deep(tbody td) {
  border: 1px solid var(--ui-border);
  border-top-width: 0;
  border-right-width: 0;
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
}

.report-spreadsheet-mode :deep(tbody tr:nth-child(even)) {
  background: color-mix(in srgb, var(--ui-bg-elevated) 35%, transparent);
}

.report-spreadsheet-mode :deep(tbody tr:hover) {
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
}
</style>
