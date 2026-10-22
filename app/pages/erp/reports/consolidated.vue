<script setup lang="ts">
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
const companies = ref<ConsolidatedReportCompanyOption[]>([])
const selectedCompanyIds = ref<string[]>([])
const report = ref<ConsolidatedReportResponse | null>(null)
const loading = ref(false)
const exporting = ref<'pdf' | 'xlsx' | 'csv' | null>(null)
const metrics = [
  { key: 'sales', label: 'Ventas facturadas', icon: 'i-lucide-trending-up' },
  { key: 'purchases', label: 'Compras facturadas', icon: 'i-lucide-shopping-bag' },
  { key: 'collections', label: 'Cobros', icon: 'i-lucide-hand-coins' },
  { key: 'payments', label: 'Pagos', icon: 'i-lucide-credit-card' },
  { key: 'receivables', label: 'Por cobrar actual', icon: 'i-lucide-circle-dollar-sign' },
  { key: 'payables', label: 'Por pagar actual', icon: 'i-lucide-receipt-text' }
] as const
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
const companySummaryRows = computed(() => (report.value?.companies ?? []).map(company => ({
  ...company,
  id: company.company_id,
  ...Object.fromEntries(metrics.map(metric => [`${metric.key}_display`, formatTotals(company[metric.key])])),
  banks_display: formatTotals(company.banks),
  cash_display: formatTotals(company.cash),
  checks_display: formatTotals(company.pending_checks),
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
  return reportView.value === 'consolidated' || reportView.value === area
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
watch(reportView, () => { report.value = null })
</script>

<template>
  <UPage class="mx-auto !block w-0 min-w-full max-w-full space-y-6 overflow-x-clip px-4 pb-10 sm:px-6">
    <AppPageHeader :title="currentView.title" :description="currentView.description">
      <template #links><UButton label="Generar reporte" icon="i-lucide-file-chart-column" :loading="loading" :disabled="!canGenerate" @click="generateReport" /></template>
    </AppPageHeader>

    <UPageCard variant="subtle" class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><p class="font-semibold">1. Empresas y período</p><p class="text-sm text-muted">Sólo se muestran empresas asociadas a tu usuario.</p></div>
        <UButton :label="allSelected ? 'Quitar todas' : 'Seleccionar todas'" color="neutral" variant="ghost" size="sm" @click="toggleAll" />
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label v-for="company in companies" :key="company.id" class="flex cursor-pointer items-center gap-3 rounded-xl border border-default p-4 transition hover:bg-elevated/50">
          <UCheckbox :model-value="selectedCompanyIds.includes(company.id)" @update:model-value="toggleCompany(company.id, $event)" />
          <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ company.name }}</span><span class="text-xs text-muted">{{ company.subdomain }} · {{ company.role }}</span></span>
        </label>
      </div>
      <UAlert v-if="!companies.length" color="warning" icon="i-lucide-building-2" title="No hay empresas disponibles" description="Tu usuario no tiene empresas asociadas para consolidar." />
      <div class="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" class="w-full" @update:model-value="report = null" /></UFormField>
        <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" class="w-full" @update:model-value="report = null" /></UFormField>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-elevated/20 p-4">
        <div><p class="font-medium">Presentación de empresas</p><p class="text-sm text-muted">Elegí si combinar los registros en una tabla por tema o mantenerlos separados.</p></div>
        <div class="flex gap-2">
          <UButton label="Juntas" icon="i-lucide-layers-2" :color="companyDisplayMode === 'combined' ? 'primary' : 'neutral'" :variant="companyDisplayMode === 'combined' ? 'solid' : 'outline'" @click="companyDisplayMode = 'combined'" />
          <UButton label="Por empresa" icon="i-lucide-building-2" :color="companyDisplayMode === 'separate' ? 'primary' : 'neutral'" :variant="companyDisplayMode === 'separate' ? 'solid' : 'outline'" @click="companyDisplayMode = 'separate'" />
        </div>
      </div>
      <p v-if="filters.date_from > filters.date_to" class="text-sm text-error">La fecha desde no puede ser posterior a la fecha hasta.</p>
    </UPageCard>

    <div v-if="loading && !report" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><USkeleton v-for="item in 6" :key="item" class="h-32 rounded-xl" /></div>
    <template v-if="report">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-elevated/25 p-4">
        <div><p class="font-semibold">2. Resultado</p><p class="text-sm text-muted">{{ report.companies.length }} empresas · {{ report.period.from }} al {{ report.period.to }}</p></div>
        <div class="flex flex-wrap gap-2">
          <UButton label="PDF" icon="i-lucide-file-text" color="neutral" variant="outline" :loading="exporting === 'pdf'" @click="download('pdf')" />
          <UButton label="Excel" icon="i-lucide-sheet" color="neutral" variant="outline" :loading="exporting === 'xlsx'" @click="download('xlsx')" />
          <UButton label="CSV" icon="i-lucide-download" color="neutral" variant="outline" :loading="exporting === 'csv'" @click="download('csv')" />
        </div>
      </div>
      <div v-if="reportView === 'consolidated'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UPageCard v-for="metric in metrics" :key="metric.key" variant="subtle"><div class="flex items-start gap-3"><div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon :name="metric.icon" class="size-5" /></div><div><p class="text-sm text-muted">{{ metric.label }}</p><p class="mt-1 text-xl font-bold">{{ formatTotals(report.consolidated[metric.key]) }}</p></div></div></UPageCard>
      </div>
      <UAlert color="info" icon="i-lucide-info" title="Criterio del reporte" :description="report.currency_note + ' Los saldos financieros son actuales; ventas, compras, pagos y cobros corresponden al período.'" />
      <UPageCard v-if="reportView === 'consolidated'" variant="subtle" class="overflow-hidden">
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

      <div v-if="companyDisplayMode === 'combined'" class="min-w-0 max-w-full space-y-5 overflow-x-clip">
        <div><p class="text-lg font-semibold">3. Detalle por tema</p><p class="text-sm text-muted">Una tabla por tipo de información. El distintivo de color identifica la empresa de cada fila.</p></div>

        <UPageCard v-if="combinedAlertRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Prioridades de seguimiento</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-alerts" :data="combinedAlertRows" :columns="alertColumns" :filter-fields="quickFilters(['company_name', 'Empresa'], ['alert', 'Alerta'])" :sort-fields="sortOptions(['Empresa', 'company_name'])" search-placeholder="Buscar alerta o empresa..." /></UPageCard>
        <UPageCard v-if="combinedNarrativeRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Lectura ejecutiva</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-narratives" :data="combinedNarrativeRows" :columns="narrativeColumns" :filter-fields="quickFilters(['company_name', 'Empresa'], ['narrative', 'Resumen'])" :sort-fields="sortOptions(['Empresa', 'company_name'])" search-placeholder="Buscar resumen o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('customers') || showArea('suppliers')" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Partes interesadas y cuentas corrientes</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-parties" :data="combinedPartyRows" :columns="withCompanyColumn(partyColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['role_label', 'Grupo'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Grupo', 'role_label'])" search-placeholder="Buscar grupo o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('treasury') && combinedFinancialRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><div><p class="font-semibold">Bancos y cajas</p><p class="text-xs text-muted">Los saldos de distintas empresas y monedas se conservan por separado.</p></div></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-treasury" :data="combinedFinancialRows" :columns="withCompanyColumn(financialColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['type', 'Tipo'], ['name', 'Cuenta'], ['status', 'Estado'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Cuenta', 'name'])" search-placeholder="Buscar banco, caja o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('hr') && combinedPeopleRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Empleados y socios</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-people" :data="combinedPeopleRows" :columns="withCompanyColumn(peopleColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['name', 'Persona'], ['kind_label', 'Tipo'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Persona', 'name'])" search-placeholder="Buscar persona o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('documents') && combinedDocumentRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Documentos de venta y compra</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-documents" :data="combinedDocumentRows" :columns="withCompanyColumn(documentColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['direction_label', 'Circuito'], ['category_label', 'Documento'], ['status_label', 'Estado'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Documento', 'category_label'])" search-placeholder="Buscar documento o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('inventory') && combinedInventoryRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><div><p class="font-semibold">Documentos de venta por artículo</p><p class="text-xs text-muted">Incluye órdenes y facturas asociadas, sin duplicar importes.</p></div></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-inventory" :data="combinedInventoryRows" :columns="withCompanyColumn(inventoryColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['type_label', 'Tipo'], ['customer', 'Cliente'], ['product', 'Artículo'], ['user', 'Usuario'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Fecha', 'document_date'], ['Artículo', 'product'])" search-placeholder="Buscar artículo, cliente o empresa..." /></UPageCard>
        <UPageCard v-if="showArea('inventory') && combinedStockRows.length" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">Movimientos de stock</p></template><AsteriskTable compact class="min-w-0 max-w-full" storage-key="report-combined-stock" :data="combinedStockRows" :columns="withCompanyColumn(stockColumns)" :filter-fields="quickFilters(['company_name', 'Empresa'], ['product', 'Producto'], ['movement_type', 'Origen'], ['direction', 'Movimiento'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Producto', 'product'])" search-placeholder="Buscar producto o empresa..." /></UPageCard>
        <UPageCard v-for="section in detailSections.filter(item => showDetailSection(item.key) && (report?.companies.some(company => company.details[item.key].length)))" :key="`combined-${section.key}`" variant="subtle" class="min-w-0 max-w-full overflow-hidden"><template #header><p class="font-semibold">{{ section.label }}</p></template><AsteriskTable compact class="min-w-0 max-w-full" :storage-key="`report-combined-${section.key}`" :data="combinedDetailRows(section.key)" :columns="withCompanyColumn(detailColumns(['customer_balances', 'supplier_balances'].includes(section.key)))" :filter-fields="quickFilters(['company_name', 'Empresa'], ['label', 'Detalle'])" :sort-fields="sortOptions(['Empresa', 'company_name'], ['Detalle', 'label'])" search-placeholder="Buscar detalle o empresa..." /></UPageCard>
      </div>

      <div v-else class="space-y-5">
        <div><p class="text-lg font-semibold">3. Detalle por empresa</p><p class="text-sm text-muted">Anexos operativos equivalentes al informe completo de referencia.</p></div>
        <UPageCard v-for="company in report.companies" :key="`detail-${company.company_id}`" variant="subtle" class="w-0 min-w-full max-w-full overflow-x-clip">
          <template #header><div><p class="text-lg font-semibold">{{ company.company_name }}</p><p class="text-xs text-muted">Movimientos del período y saldos actuales</p></div></template>
          <div class="min-w-0 max-w-full space-y-6 overflow-x-clip">
            <UAlert v-if="company.details.alerts.length" color="warning" icon="i-lucide-triangle-alert" title="Prioridades de seguimiento">
              <template #description><ul class="mt-1 list-disc space-y-1 pl-5"><li v-for="alert in company.details.alerts" :key="alert">{{ alert }}</li></ul></template>
            </UAlert>

            <section class="rounded-xl border border-default bg-elevated/20 p-4">
              <p class="mb-2 font-semibold">Lectura ejecutiva</p>
              <ul class="list-disc space-y-2 pl-5 text-sm text-muted"><li v-for="text in visibleNarratives(company)" :key="text">{{ text }}</li></ul>
            </section>

            <section v-if="showArea('customers') || showArea('suppliers')">
              <p class="mb-2 font-semibold">Partes interesadas y cuentas corrientes</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-parties`" :data="partyTableRows(company)" :columns="partyColumns" :filter-fields="quickFilters(['role_label', 'Grupo'])" :sort-fields="sortOptions(['Grupo', 'role_label'], ['Saldo neto', 'balance_display'])" search-placeholder="Buscar grupo..." /></div>
            </section>

            <section v-if="showArea('treasury') && (company.details.bank_accounts.length || company.details.cash_boxes.length)">
              <p class="mb-2 font-semibold">Bancos y cajas</p>
              <p class="mb-3 text-sm text-muted">El saldo es el valor actual. La variación excluye aperturas y corresponde únicamente al período seleccionado.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-treasury-accounts`" :data="financialTableRows(company)" :columns="financialColumns" :filter-fields="quickFilters(['type', 'Tipo'], ['name', 'Cuenta'], ['status', 'Estado'])" :sort-fields="sortOptions(['Cuenta', 'name'], ['Saldo actual', 'balance_display'])" search-placeholder="Buscar banco o caja..." /></div>
            </section>

            <section v-if="showArea('hr') && (company.details.employees.length || company.details.partners.length)">
              <p class="mb-2 font-semibold">Empleados y socios</p>
              <p class="mb-3 text-sm text-muted">Los movimientos muestran vales y retiros del período. Los pendientes se presentan separados de los importes ya registrados.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-people`" :data="peopleTableRows(company)" :columns="peopleColumns" :filter-fields="quickFilters(['name', 'Persona'], ['kind_label', 'Tipo'], ['detail', 'Datos'])" :sort-fields="sortOptions(['Persona', 'name'], ['Tipo', 'kind_label'])" search-placeholder="Buscar persona..." /></div>
            </section>

            <section v-if="showArea('documents')">
              <p class="mb-2 font-semibold">Documentos de venta y compra</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-documents`" :data="documentTableRows(company)" :columns="documentColumns" :filter-fields="quickFilters(['direction_label', 'Circuito'], ['category_label', 'Documento'], ['status_label', 'Estado'])" :sort-fields="sortOptions(['Documento', 'category_label'], ['Cantidad', 'count'])" search-placeholder="Buscar documento..." /></div>
            </section>

            <section v-if="showArea('inventory') && company.details.inventory_orders.length" class="min-w-0 max-w-full overflow-hidden">
              <p class="mb-2 font-semibold">Documentos de venta por artículo</p>
              <p class="mb-3 text-sm text-muted">Incluye órdenes de venta con sus facturas asociadas y facturas directas cuando la empresa no utiliza OV. Los importes se muestran una sola vez por documento.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-inventory-documents`" :data="inventoryTableRows(company)" :columns="inventoryColumns" :filter-fields="quickFilters(['type_label', 'Tipo'], ['customer', 'Cliente'], ['product', 'Artículo'], ['user', 'Usuario'])" :sort-fields="sortOptions(['Fecha', 'document_date'], ['Documento', 'document_number'], ['Artículo', 'product'])" search-placeholder="Buscar artículo, cliente o documento..." /></div>
            </section>

            <section v-if="showArea('inventory') && company.details.stock_movements.length">
              <p class="mb-2 font-semibold">Movimientos de stock</p>
              <p class="mb-3 text-sm text-muted">Las entradas se muestran positivas y las salidas negativas. “Movimientos” indica cuántos registros forman la cantidad neta.</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-stock-movements`" :data="stockTableRows(company)" :columns="stockColumns" :filter-fields="quickFilters(['product', 'Producto'], ['movement_type', 'Origen'], ['direction', 'Movimiento'])" :sort-fields="sortOptions(['Producto', 'product'], ['Cantidad neta', 'quantity'])" search-placeholder="Buscar producto..." /></div>
            </section>

            <section v-for="section in detailSections" :key="section.key" v-show="showDetailSection(section.key) && company.details[section.key].length">
              <p class="mb-2 font-semibold">{{ section.label }}</p>
              <div class="max-w-full overflow-x-auto"><AsteriskTable compact :storage-key="`report-${company.company_id}-${section.key}`" :data="detailTableRows(company, section.key)" :columns="detailColumns(['customer_balances', 'supplier_balances'].includes(section.key))" :filter-fields="quickFilters(['label', 'Detalle'])" :sort-fields="sortOptions(['Detalle', 'label'], ['Registros', 'count'])" search-placeholder="Buscar detalle..." /></div>
            </section>
          </div>
        </UPageCard>
      </div>
    </template>
  </UPage>
</template>
