<script setup lang="ts">
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type { ConsolidatedReportCompanyOption, ConsolidatedReportResponse, ConsolidatedReportView, CurrencyTotals } from '~/modulos/erp/management-reports/consolidated-reports.types'

definePageMeta({ middleware: ['auth'] })

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
        <div class="overflow-x-auto"><table class="w-full min-w-[1100px] text-sm"><thead class="border-b border-default text-left text-xs uppercase text-muted"><tr><th class="p-3">Empresa</th><th v-for="metric in metrics" :key="metric.key" class="p-3 text-right">{{ metric.label }}</th><th class="p-3 text-right">Bancos</th><th class="p-3 text-right">Cajas</th><th class="p-3 text-right">Cheques pendientes</th></tr></thead><tbody><tr v-for="company in report.companies" :key="company.company_id" class="border-b border-default/60 hover:bg-elevated/40"><td class="p-3"><p class="font-medium">{{ company.company_name }}</p><p class="text-xs text-muted">{{ company.subdomain }}</p></td><td v-for="metric in metrics" :key="metric.key" class="p-3 text-right whitespace-nowrap">{{ formatTotals(company[metric.key]) }}</td><td class="p-3 text-right whitespace-nowrap">{{ formatTotals(company.banks) }}</td><td class="p-3 text-right whitespace-nowrap">{{ formatTotals(company.cash) }}</td><td class="p-3 text-right whitespace-nowrap">{{ formatTotals(company.pending_checks) }}</td></tr></tbody></table></div>
      </UPageCard>

      <div class="space-y-5">
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
              <div class="overflow-x-auto"><table class="w-full min-w-[760px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Grupo</th><th class="p-2 text-right">Registrados</th><th class="p-2 text-right">Activos</th><th class="p-2 text-right">Con saldo</th><th class="p-2 text-right">Saldo neto</th></tr></thead><tbody><tr v-for="row in visiblePartyRows(company)" :key="row.role" class="border-b border-default/50"><td class="p-2 font-medium">{{ partyRoleLabel(row.role) }}</td><td class="p-2 text-right">{{ row.total }}</td><td class="p-2 text-right">{{ row.active }}</td><td class="p-2 text-right">{{ row.with_balance }}</td><td class="p-2 text-right">{{ formatAmount(row.balance, row.currency_code) }}</td></tr></tbody></table></div>
            </section>

            <section v-if="showArea('treasury') && (company.details.bank_accounts.length || company.details.cash_boxes.length)">
              <p class="mb-2 font-semibold">Bancos y cajas</p>
              <p class="mb-3 text-sm text-muted">El saldo es el valor actual. La variación excluye aperturas y corresponde únicamente al período seleccionado.</p>
              <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Tipo</th><th class="p-2 text-left">Cuenta</th><th class="p-2 text-left">Estado</th><th class="p-2 text-right">Movimientos</th><th class="p-2 text-right">Apertura</th><th class="p-2 text-right">Variación</th><th class="p-2 text-right">Saldo actual</th></tr></thead><tbody><tr v-for="row in company.details.bank_accounts" :key="`bank-${row.name}-${row.currency_code}`" class="border-b border-default/50"><td class="p-2">Banco</td><td class="p-2"><p class="font-medium">{{ row.name }}</p><p class="text-xs text-muted">{{ row.institution }}</p></td><td class="p-2">{{ row.status }}</td><td class="p-2 text-right">{{ row.movement_count }}</td><td class="p-2 text-right">{{ formatAmount(row.opening_amount, row.currency_code) }}</td><td class="p-2 text-right">{{ formatAmount(row.period_change, row.currency_code) }}</td><td class="p-2 text-right font-medium">{{ formatAmount(row.current_balance, row.currency_code) }}</td></tr><tr v-for="row in company.details.cash_boxes" :key="`cash-${row.name}-${row.currency_code}`" class="border-b border-default/50"><td class="p-2">Caja</td><td class="p-2"><p class="font-medium">{{ row.name }}</p><p class="text-xs text-muted">{{ row.institution }}</p></td><td class="p-2">{{ row.status }}</td><td class="p-2 text-right">{{ row.movement_count }}</td><td class="p-2 text-right">{{ formatAmount(row.opening_amount, row.currency_code) }}</td><td class="p-2 text-right">{{ formatAmount(row.period_change, row.currency_code) }}</td><td class="p-2 text-right font-medium">{{ formatAmount(row.current_balance, row.currency_code) }}</td></tr></tbody></table></div>
            </section>

            <section v-if="showArea('hr') && (company.details.employees.length || company.details.partners.length)">
              <p class="mb-2 font-semibold">Empleados y socios</p>
              <p class="mb-3 text-sm text-muted">Los movimientos muestran vales y retiros del período. Los pendientes se presentan separados de los importes ya registrados.</p>
              <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Tipo</th><th class="p-2 text-left">Persona</th><th class="p-2 text-left">Datos</th><th class="p-2 text-right">Movimientos</th><th class="p-2 text-right">Importe período</th><th class="p-2 text-right">Pendiente</th></tr></thead><tbody><tr v-for="row in [...company.details.employees, ...company.details.partners]" :key="`${row.kind}-${row.name}`" class="border-b border-default/50"><td class="p-2">{{ row.kind === 'EMPLOYEE' ? 'Empleado' : 'Socio' }}</td><td class="p-2"><p class="font-medium">{{ row.name }}</p><p class="text-xs text-muted">{{ row.active ? 'Activo' : 'Inactivo' }}</p></td><td class="p-2">{{ row.detail }}</td><td class="p-2 text-right">{{ row.movements_count }}</td><td class="p-2 text-right">{{ formatAmount(row.movements_amount, row.currency_code) }}</td><td class="p-2 text-right">{{ formatAmount(row.pending_amount, row.currency_code) }}</td></tr></tbody></table></div>
            </section>

            <section v-if="showArea('documents')">
              <p class="mb-2 font-semibold">Documentos de venta y compra</p>
              <div class="overflow-x-auto"><table class="w-full min-w-[680px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Circuito</th><th class="p-2 text-left">Documento</th><th class="p-2 text-left">Estado</th><th class="p-2 text-right">Cantidad</th><th class="p-2 text-right">Importe</th></tr></thead><tbody><tr v-for="row in company.details.documents" :key="`${row.direction}-${row.category}-${row.status}-${row.currency_code}`" class="border-b border-default/50"><td class="p-2">{{ row.direction === 'SALE' ? 'Venta' : 'Compra' }}</td><td class="p-2">{{ documentCategoryLabel(row.category) }}</td><td class="p-2">{{ documentStatusLabel(row.status, row.category) }}</td><td class="p-2 text-right">{{ row.count }}</td><td class="p-2 text-right">{{ formatAmount(row.amount, row.currency_code) }}</td></tr></tbody></table></div>
            </section>

            <section v-if="showArea('inventory') && company.details.inventory_orders.length" class="min-w-0 max-w-full overflow-hidden">
              <p class="mb-2 font-semibold">Órdenes de venta por artículo</p>
              <p class="mb-3 text-sm text-muted">Detalle operativo de los artículos solicitados, su estado y el usuario que cargó cada orden.</p>
              <div class="max-h-[65vh] w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-default"><table class="min-w-[1200px] text-sm"><thead class="sticky top-0 z-10 border-b border-default bg-default text-xs uppercase text-muted"><tr><th class="p-3 text-left">Empresa</th><th class="p-3 text-right">OV</th><th class="p-3 text-left">Fecha OV</th><th class="p-3 text-left">Cliente</th><th class="p-3 text-left">Artículo</th><th class="p-3 text-right">Cantidad</th><th class="p-3 text-left">Estado</th><th class="p-3 text-left">Confirmación</th><th class="p-3 text-left">Usuario</th></tr></thead><tbody><tr v-for="row in company.details.inventory_orders" :key="`${row.order_number}-${row.product}-${row.quantity}`" class="border-b border-default/50 hover:bg-elevated/40"><td class="p-3">{{ company.company_name }}</td><td class="p-3 text-right font-medium">{{ row.order_number }}</td><td class="p-3 whitespace-nowrap">{{ row.order_date }}</td><td class="p-3">{{ row.customer }}</td><td class="p-3">{{ row.product }}</td><td class="p-3 text-right">{{ row.quantity.toLocaleString('es-AR') }}</td><td class="p-3">{{ row.status }}</td><td class="p-3 whitespace-nowrap">{{ formatConfirmation(row.confirmation_at) }}</td><td class="p-3">{{ row.user }}</td></tr></tbody></table></div>
            </section>

            <section v-if="showArea('inventory') && company.details.stock_movements.length">
              <p class="mb-2 font-semibold">Movimientos de stock</p>
              <p class="mb-3 text-sm text-muted">Las entradas se muestran positivas y las salidas negativas. “Movimientos” indica cuántos registros forman la cantidad neta.</p>
              <div class="max-w-full overflow-x-auto pb-2"><table class="w-full min-w-[760px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Producto</th><th class="p-2 text-left">Origen</th><th class="p-2 text-left">Movimiento</th><th class="p-2 text-right">Cantidad neta</th><th class="p-2 text-right">Movimientos</th></tr></thead><tbody><tr v-for="row in company.details.stock_movements" :key="`${row.product}-${row.movement_type}-${row.direction}`" class="border-b border-default/50"><td class="p-2 font-medium">{{ row.product }}</td><td class="p-2">{{ row.movement_type }}</td><td class="p-2">{{ row.direction }}</td><td class="p-2 text-right">{{ row.quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 }) }}</td><td class="p-2 text-right">{{ row.count }}</td></tr></tbody></table></div>
            </section>

            <section v-for="section in detailSections" :key="section.key" v-show="showDetailSection(section.key) && company.details[section.key].length">
              <p class="mb-2 font-semibold">{{ section.label }}</p>
              <div class="overflow-x-auto"><table class="w-full min-w-[680px] text-sm"><thead class="border-b border-default text-xs uppercase text-muted"><tr><th class="p-2 text-left">Detalle</th><th class="p-2 text-right">Registros</th><th class="p-2 text-right">Importe</th><th v-if="['customer_balances', 'supplier_balances'].includes(section.key)" class="p-2 text-right">Saldo</th></tr></thead><tbody><tr v-for="row in company.details[section.key]" :key="`${row.label}-${row.currency_code}`" class="border-b border-default/50"><td class="p-2">{{ row.label }}</td><td class="p-2 text-right">{{ row.count }}</td><td class="p-2 text-right">{{ formatAmount(row.amount, row.currency_code) }}</td><td v-if="['customer_balances', 'supplier_balances'].includes(section.key)" class="p-2 text-right">{{ formatAmount(row.balance ?? 0, row.currency_code) }}</td></tr></tbody></table></div>
            </section>
          </div>
        </UPageCard>
      </div>
    </template>
  </UPage>
</template>
