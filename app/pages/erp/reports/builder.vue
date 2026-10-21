<script setup lang="ts">
import { useManagementReportsService, type ManagementReportQuery } from '~/modulos/erp/management-reports/management-reports.service'
import type { ManagementReportMetadata, ManagementReportResponse, ReportChartType, ReportTemplateColumn, ReportVisualization, SavedManagementReportTemplate } from '~/modulos/erp/management-reports/management-reports.types'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import * as XLSX from 'xlsx'

definePageMeta({ middleware: ['auth', 'management-reports'] })
useHead({ title: 'Diseñador de reportes | AsteriskSuite' })

type ReportRow = Record<string, any> & { id: string }
const service = useManagementReportsService()
const auth = useAuthStore()
const toast = useToast()
const today = new Date()
const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const query = reactive<ManagementReportQuery>({
  basis: 'INVOICE', date_from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: isoDate(today),
  group_by: 'MONTH', payment_state: 'ALL', invoicing_state: 'ALL', delivery_state: 'ALL', currency_code: 'ALL',
  party_id: 'ALL', seller_id: 'ALL', product_id: 'ALL', point_of_sale_id: 'ALL', rows_limit: 5000,
})
const metadata = ref<ManagementReportMetadata | null>(null)
const report = ref<ManagementReportResponse | null>(null)
const templates = ref<SavedManagementReportTemplate[]>([])
const selectedColumns = ref<ReportTemplateColumn[]>(['date', 'label', 'party_name', 'amount', 'paid_amount', 'pending_amount', 'payment_state'])
const selectedVisualizations = ref<ReportVisualization[]>(['KPIS', 'CHART', 'TABLE'])
const chartType = ref<ReportChartType>('BAR')
const templateName = ref('')
const shareTemplate = ref(false)
const loading = ref(false)
const saving = ref(false)
const loadingTemplates = ref(false)
const deletingId = ref<string | null>(null)
const editingId = ref<string | undefined>()
const templatePendingDelete = ref<SavedManagementReportTemplate | null>(null)
const showDeleteTemplateModal = ref(false)

const basisOptions = [
  { label: 'Facturas', value: 'INVOICE' },
  { label: 'Órdenes de venta', value: 'SALES_ORDER' },
  { label: 'Cobros', value: 'COLLECTION' },
]
const groupOptions = [
  { label: 'Por mes', value: 'MONTH' }, { label: 'Por día', value: 'DAY' },
  { label: 'Por cliente', value: 'PARTY' }, { label: 'Por vendedor', value: 'SELLER' }, { label: 'Por moneda', value: 'CURRENCY' },
]
const paymentOptions = [
  { label: 'Todos', value: 'ALL' }, { label: 'Sin cobrar', value: 'UNPAID' },
  { label: 'Cobro parcial', value: 'PARTIAL' }, { label: 'Cobrados', value: 'PAID' },
]
const currencyOptions = [{ label: 'Todas', value: 'ALL' }, { label: 'ARS', value: 'ARS' }, { label: 'USD', value: 'USD' }]
const progressOptions = [
  { label: 'Todos', value: 'ALL' }, { label: 'Sin iniciar', value: 'NONE' }, { label: 'Parcial', value: 'PARTIAL' }, { label: 'Completo', value: 'COMPLETE' },
]
const visualizationOptions: Array<{ label: string; value: ReportVisualization; description: string; icon: string }> = [
  { label: 'Indicadores', value: 'KPIS', description: 'Totales por moneda', icon: 'i-lucide-panels-top-left' },
  { label: 'Gráfico', value: 'CHART', description: 'Compará períodos o grupos', icon: 'i-lucide-chart-no-axes-combined' },
  { label: 'Tabla', value: 'TABLE', description: 'Detalle filtrable y ordenable', icon: 'i-lucide-table' },
]
const chartTypeOptions = [
  { label: 'Columnas', value: 'BAR' }, { label: 'Líneas', value: 'LINE' }, { label: 'Dona', value: 'DONUT' },
]
const partyOptions = computed(() => [{ label: 'Todos los clientes', value: 'ALL' }, ...(metadata.value?.parties.map(item => ({ label: item.name, value: item.id })) ?? [])])
const sellerOptions = computed(() => [{ label: 'Todos los vendedores', value: 'ALL' }, ...(metadata.value?.sellers.map(item => ({ label: `${item.first_name} ${item.last_name}`.trim(), value: item.id })) ?? [])])
const productOptions = computed(() => [{ label: 'Todos los productos', value: 'ALL' }, ...(metadata.value?.products.map(item => ({ label: item.sku ? `${item.sku} · ${item.name}` : item.name, value: item.id })) ?? [])])
const pointOptions = computed(() => [{ label: 'Todos los puntos de venta', value: 'ALL' }, ...(metadata.value?.points_of_sale.map(item => ({ label: `${item.point_of_sale} · ${item.name}`, value: item.id })) ?? [])])
const columnOptions: Array<{ key: ReportTemplateColumn; label: string; accessor: string; type: 'text' | 'number' | 'select' }> = [
  { key: 'date', label: 'Fecha', accessor: 'date_display', type: 'text' },
  { key: 'label', label: 'Documento', accessor: 'label', type: 'text' },
  { key: 'party_name', label: 'Cliente', accessor: 'party_name', type: 'text' },
  { key: 'currency_code', label: 'Moneda', accessor: 'currency_code', type: 'select' },
  { key: 'amount', label: 'Total', accessor: 'amount_display', type: 'text' },
  { key: 'paid_amount', label: 'Cobrado', accessor: 'paid_display', type: 'text' },
  { key: 'pending_amount', label: 'Pendiente', accessor: 'pending_display', type: 'text' },
  { key: 'payment_state', label: 'Estado de cobro', accessor: 'payment_state_label', type: 'select' },
]
const formatCurrency = (value: number, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0)
const paymentStateLabel = (value: string) => ({ PAID: 'Cobrado', PARTIAL: 'Parcial', UNPAID: 'Pendiente', ALL: 'Todos' } as Record<string, string>)[value] ?? value
const rows = computed<ReportRow[]>(() => (report.value?.rows ?? []).map(row => ({
  ...row,
  date_display: new Date(row.date).toLocaleDateString('es-AR'),
  amount_display: formatCurrency(row.amount, row.currency_code),
  paid_display: formatCurrency(row.paid_amount, row.currency_code),
  pending_display: formatCurrency(row.pending_amount, row.currency_code),
  payment_state_label: paymentStateLabel(row.payment_state),
})))
const columns = computed<ExtendedColumn<ReportRow>[]>(() => columnOptions
  .filter(option => selectedColumns.value.includes(option.key))
  .map(option => ({
    accessorKey: option.accessor,
    header: option.label,
    meta: {
      label: option.label,
      filter: option.type === 'select'
        ? { type: 'select', options: option.key === 'currency_code' ? currencyOptions.filter(item => item.value !== 'ALL') : [{ label: 'Cobrado', value: 'Cobrado' }, { label: 'Parcial', value: 'Parcial' }, { label: 'Pendiente', value: 'Pendiente' }] }
        : { type: 'text', operators: ['contains', 'equals'] },
    },
  })))
const quickFilters = computed<FilterField[]>(() => columnOptions.filter(option => selectedColumns.value.includes(option.key)).map(option => ({ id: option.accessor, label: option.label })))
const sortFields = computed<SortField[]>(() => columnOptions.filter(option => selectedColumns.value.includes(option.key)).map(option => ({ label: option.label, value: option.accessor })))
const requestQuery = computed<ManagementReportQuery>(() => ({
  basis: query.basis,
  date_from: query.date_from,
  date_to: query.date_to,
  group_by: query.group_by,
  payment_state: query.basis === 'COLLECTION' ? 'ALL' : query.payment_state,
  currency_code: query.currency_code && query.currency_code !== 'ALL' ? query.currency_code : undefined,
  party_id: query.party_id && query.party_id !== 'ALL' ? query.party_id : undefined,
  seller_id: query.basis === 'SALES_ORDER' && query.seller_id && query.seller_id !== 'ALL' ? query.seller_id : undefined,
  product_id: query.basis !== 'COLLECTION' && query.product_id && query.product_id !== 'ALL' ? query.product_id : undefined,
  point_of_sale_id: query.basis !== 'COLLECTION' && query.point_of_sale_id && query.point_of_sale_id !== 'ALL' ? query.point_of_sale_id : undefined,
  invoicing_state: query.basis === 'SALES_ORDER' ? query.invoicing_state : 'ALL',
  delivery_state: query.basis === 'SALES_ORDER' ? query.delivery_state : 'ALL',
  rows_limit: query.rows_limit ?? 5000,
}))
const canGenerate = computed(() => query.date_from <= query.date_to && selectedColumns.value.length > 0 && selectedVisualizations.value.length > 0)
const visualizedGroups = computed(() => report.value?.grouped_by_currency ?? [])
const chartOption = computed(() => {
  const grouped = visualizedGroups.value
  if (chartType.value === 'DONUT') {
    if (query.currency_code === 'ALL') return {}
    const currencyGroups = grouped.filter(item => item.currency_code === query.currency_code)
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => `${item.name}<br/>${formatCurrency(item.value, query.currency_code)}` },
      legend: { type: 'scroll', bottom: 0 },
      series: [{ type: 'pie', radius: ['42%', '72%'], center: ['50%', '45%'], itemStyle: { borderRadius: 6, borderColor: 'var(--ui-bg)', borderWidth: 2 }, label: { formatter: '{b}: {d}%' }, data: currencyGroups.map(item => ({ name: item.label, value: item.total })) }],
    }
  }
  const categories = [...new Set(grouped.map(item => item.label))]
  const currencies = [...new Set(grouped.map(item => item.currency_code))]
  const metrics = [
    { key: 'total', label: 'Total' }, { key: 'paid', label: 'Cobrado' }, { key: 'pending', label: 'Pendiente' },
  ] as const
  const series = currencies.flatMap(currency => metrics.map(metric => ({
    name: `${metric.label} · ${currency}`,
    type: chartType.value === 'LINE' ? 'line' : 'bar',
    smooth: true,
    data: categories.map(label => grouped.find(item => item.label === label && item.currency_code === currency)?.[metric.key] ?? 0),
  })))
  return {
    tooltip: { trigger: 'axis', formatter: (params: any[]) => [params[0]?.axisValue, ...params.map(item => `${item.marker}${item.seriesName}: ${formatCurrency(item.value, String(item.seriesName.split(' · ').at(-1) ?? 'ARS'))}`)].join('<br/>') }, legend: { bottom: 0, type: 'scroll' },
    grid: { left: 64, right: 20, top: 20, bottom: 64, containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: categories.length > 8 ? 35 : 0, hideOverlap: true } },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) } },
    series: series.map(item => ({ ...item, ...(chartType.value === 'BAR' ? { itemStyle: { borderRadius: [5, 5, 0, 0] } } : {}) })),
  }
})

function toggleColumn(column: ReportTemplateColumn, checked: boolean | 'indeterminate') {
  selectedColumns.value = checked === true
    ? [...new Set([...selectedColumns.value, column])]
    : selectedColumns.value.filter(item => item !== column)
}

function toggleVisualization(value: ReportVisualization) {
  selectedVisualizations.value = selectedVisualizations.value.includes(value)
    ? selectedVisualizations.value.filter(item => item !== value)
    : [...selectedVisualizations.value, value]
}

async function loadReport() {
  if (!canGenerate.value) return
  loading.value = true
  try {
    report.value = await service.getReport(requestQuery.value)
  } catch (error: any) {
    toast.add({ title: 'No se pudo generar el reporte', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { loading.value = false }
}

async function loadTemplates() {
  loadingTemplates.value = true
  try { templates.value = await service.getTemplates() }
  catch (error: any) { toast.add({ title: 'No se pudieron cargar las plantillas', description: error?.data?.message ?? error.message, color: 'warning' }) }
  finally { loadingTemplates.value = false }
}

function applyTemplate(template: SavedManagementReportTemplate) {
  editingId.value = template.is_owner ? template.id : undefined
  templateName.value = template.name
  shareTemplate.value = template.shared
  selectedColumns.value = [...template.columns]
  selectedVisualizations.value = [...(template.visualizations?.length ? template.visualizations : ['KPIS', 'CHART', 'TABLE'])]
  chartType.value = template.chart_type ?? 'BAR'
  Object.assign(query, template.query)
  void loadReport()
}

async function saveTemplate() {
  if (templateName.value.trim().length < 2 || !selectedColumns.value.length) return
  saving.value = true
  try {
    const saved = await service.saveTemplate({
      ...(editingId.value ? { id: editingId.value } : {}),
      name: templateName.value.trim(), source: 'SALES', columns: selectedColumns.value, visualizations: selectedVisualizations.value, chart_type: chartType.value, query: { ...query }, shared: shareTemplate.value,
    })
    toast.add({ title: 'Plantilla guardada', color: 'success' })
    editingId.value = saved.id
    await loadTemplates()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la plantilla', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { saving.value = false }
}

async function deleteTemplate(template: SavedManagementReportTemplate) {
  if (!template.is_owner) return
  deletingId.value = template.id
  try {
    await service.deleteTemplate(template.id)
    templates.value = templates.value.filter(item => item.id !== template.id)
    if (editingId.value === template.id) { editingId.value = undefined; templateName.value = '' }
    toast.add({ title: 'Plantilla eliminada', color: 'success' })
    showDeleteTemplateModal.value = false
    templatePendingDelete.value = null
  } catch (error: any) {
    toast.add({ title: 'No se pudo eliminar la plantilla', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { deletingId.value = null }
}

function exportCsv() {
  if (!report.value) return
  const activeColumns = columnOptions.filter(option => selectedColumns.value.includes(option.key))
  const rawValue = (row: ReportRow, key: ReportTemplateColumn) => {
    if (key === 'date') return new Date(row.date).toLocaleDateString('es-AR')
    if (key === 'payment_state') return paymentStateLabel(row.payment_state)
    return row[key]
  }
  const escape = (value: unknown) => {
    let text = String(value ?? '')
    if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const csv = [activeColumns.map(column => escape(column.label)).join(';'), ...rows.value.map(row => activeColumns.map(column => escape(rawValue(row, column.key))).join(';'))].join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-ventas-${query.date_from}-${query.date_to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function exportExcel() {
  if (!report.value) return
  const activeColumns = columnOptions.filter(option => selectedColumns.value.includes(option.key))
  const data = rows.value.map(row => Object.fromEntries(activeColumns.map(column => {
    const value = column.key === 'date'
      ? new Date(row.date).toLocaleDateString('es-AR')
      : column.key === 'payment_state'
        ? paymentStateLabel(row.payment_state)
        : row[column.key]
    return [column.label, value ?? '']
  })))
  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet['!cols'] = activeColumns.map(column => ({ wch: Math.min(36, Math.max(14, column.label.length + 4)) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas')
  XLSX.writeFile(workbook, `reporte-ventas-${query.date_from}-${query.date_to}.xlsx`)
}

onMounted(async () => {
  const [metadataResult] = await Promise.allSettled([service.getMetadata(), loadTemplates()])
  if (metadataResult.status === 'fulfilled') metadata.value = metadataResult.value
  else toast.add({ title: 'No se pudieron cargar los filtros', description: 'Revisá tu conexión e intentá nuevamente.', color: 'warning' })
})
</script>

<template>
  <UPage class="mx-auto !block w-0 min-w-full max-w-full space-y-6 overflow-x-clip px-4 pb-10 sm:px-6">
    <AppPageHeader title="Diseñador de reportes" description="Armá reportes de ventas con campos disponibles, filtros y plantillas reutilizables.">
      <template #links>
        <UButton label="Generar reporte" icon="i-lucide-play" :loading="loading" :disabled="!canGenerate" @click="loadReport" />
      </template>
    </AppPageHeader>

    <div class="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <UPageCard variant="subtle" class="min-w-0 space-y-5">
        <div>
          <p class="font-semibold">1. Fuente y período</p>
          <p class="text-sm text-muted">Fuente disponible en esta primera versión: datos de ventas de la empresa activa ({{ auth.selectedCompany?.name ?? 'empresa actual' }}).</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <UFormField label="Fuente"><USelectMenu :model-value="'SALES'" :items="[{ label: 'Ventas', value: 'SALES' }]" value-key="value" disabled class="w-full" /></UFormField>
          <UFormField label="Tomar datos de"><USelectMenu v-model="query.basis" :items="basisOptions" value-key="value" class="w-full" /></UFormField>
          <UFormField label="Agrupar resultados"><USelectMenu v-model="query.group_by" :items="groupOptions" value-key="value" class="w-full" /></UFormField>
          <UFormField label="Desde"><UInput v-model="query.date_from" type="date" class="w-full" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="query.date_to" type="date" class="w-full" /></UFormField>
          <UFormField label="Moneda"><USelectMenu v-model="query.currency_code" :items="currencyOptions" value-key="value" class="w-full" /></UFormField>
          <UFormField label="Estado de cobro"><USelectMenu v-model="query.payment_state" :items="paymentOptions" value-key="value" :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
          <UFormField label="Cliente"><USelectMenu v-model="query.party_id" :items="partyOptions" value-key="value" searchable class="w-full" /></UFormField>
          <UFormField label="Vendedor"><USelectMenu v-model="query.seller_id" :items="sellerOptions" value-key="value" searchable :disabled="query.basis !== 'SALES_ORDER'" class="w-full" /></UFormField>
          <UFormField label="Producto"><USelectMenu v-model="query.product_id" :items="productOptions" value-key="value" searchable :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
          <UFormField label="Punto de venta"><USelectMenu v-model="query.point_of_sale_id" :items="pointOptions" value-key="value" searchable :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
          <template v-if="query.basis === 'SALES_ORDER'">
            <UFormField label="Facturación"><USelectMenu v-model="query.invoicing_state" :items="progressOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Entrega"><USelectMenu v-model="query.delivery_state" :items="progressOptions" value-key="value" class="w-full" /></UFormField>
          </template>
        </div>
        <UAlert v-if="query.date_from > query.date_to" color="error" icon="i-lucide-calendar-x" title="Revisá el período" description="La fecha desde no puede ser posterior a la fecha hasta." />

        <div class="border-t border-default pt-5">
          <p class="font-semibold">2. Columnas del reporte</p>
          <p class="mb-3 text-sm text-muted">Elegí qué campos querés mostrar. Cada columna puede filtrarse y ordenarse en la vista previa.</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label v-for="column in columnOptions" :key="column.key" class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
              <UCheckbox :model-value="selectedColumns.includes(column.key)" @update:model-value="toggleColumn(column.key, $event)" />
              <span>{{ column.label }}</span>
            </label>
          </div>
          <p v-if="!selectedColumns.length" class="mt-2 text-sm text-error">Seleccioná al menos una columna.</p>
        </div>
        <div class="border-t border-default pt-5">
          <p class="font-semibold">3. Presentación</p>
          <p class="mb-3 text-sm text-muted">Combiná los bloques como en un tablero: indicadores, gráficos y/o el detalle.</p>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button v-for="item in visualizationOptions" :key="item.value" type="button" class="flex items-start gap-3 rounded-xl border p-3 text-left transition-colors" :class="selectedVisualizations.includes(item.value) ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated/50'" :aria-pressed="selectedVisualizations.includes(item.value)" @click="toggleVisualization(item.value)">
              <UIcon :name="item.icon" class="mt-0.5 size-5 shrink-0" :class="selectedVisualizations.includes(item.value) ? 'text-primary' : 'text-muted'" />
              <span><span class="block text-sm font-medium">{{ item.label }}</span><span class="block text-xs text-muted">{{ item.description }}</span></span>
              <UIcon v-if="selectedVisualizations.includes(item.value)" name="i-lucide-check" class="ml-auto size-4 text-primary" />
            </button>
          </div>
          <div v-if="selectedVisualizations.includes('CHART')" class="mt-4 flex flex-wrap items-center gap-3">
            <span class="text-sm font-medium">Tipo de gráfico</span>
            <USelectMenu v-model="chartType" :items="chartTypeOptions" value-key="value" class="w-44" />
            <span class="text-xs text-muted">Se agrupa {{ groupOptions.find(item => item.value === query.group_by)?.label.toLowerCase() }}. Las monedas se muestran como series separadas.</span>
          </div>
          <p v-if="!selectedVisualizations.length" class="mt-3 text-sm text-error">Elegí al menos una forma de visualizar el reporte.</p>
        </div>
      </UPageCard>

      <div class="min-w-0 space-y-5">
        <UPageCard variant="subtle" class="min-w-0">
          <template #header><div><p class="font-semibold">Guardar plantilla</p><p class="text-xs text-muted">Guarda filtros, columnas y presentación; no los datos del reporte.</p></div></template>
          <div class="space-y-4">
            <UFormField label="Nombre de la plantilla"><UInput v-model="templateName" maxlength="100" placeholder="Ej.: Ventas cobradas del mes" class="w-full" /></UFormField>
            <label class="flex items-center gap-3 rounded-lg border border-default p-3">
              <USwitch v-model="shareTemplate" />
              <span><span class="block text-sm font-medium">Compartir en esta empresa</span><span class="block text-xs text-muted">Visible para usuarios con acceso a reportes en esta empresa.</span></span>
            </label>
            <UButton block :label="editingId ? 'Actualizar plantilla' : 'Guardar plantilla'" icon="i-lucide-save" :loading="saving" :disabled="templateName.trim().length < 2 || !selectedColumns.length || !selectedVisualizations.length" @click="saveTemplate" />
          </div>
        </UPageCard>

        <UPageCard variant="subtle" class="min-w-0">
          <template #header><div><p class="font-semibold">Mis plantillas</p><p class="text-xs text-muted">Personales y compartidas en la empresa activa.</p></div></template>
          <div v-if="loadingTemplates" class="space-y-2"><USkeleton v-for="item in 3" :key="item" class="h-12" /></div>
          <div v-else-if="templates.length" class="space-y-2">
            <div v-for="template in templates" :key="template.id" class="flex min-w-0 items-center gap-2 rounded-lg border border-default p-3">
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ template.name }}</p><p class="text-xs text-muted">{{ template.shared ? 'Compartida' : 'Personal' }} · {{ template.columns.length }} columnas · {{ template.visualizations?.length ?? 3 }} bloques</p></div>
              <UButton icon="i-lucide-play" color="neutral" variant="ghost" aria-label="Usar plantilla" title="Usar plantilla" @click="applyTemplate(template)" />
              <UButton v-if="template.is_owner" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Eliminar plantilla" title="Eliminar plantilla" @click="templatePendingDelete = template; showDeleteTemplateModal = true" />
            </div>
          </div>
          <p v-else class="text-sm text-muted">Todavía no hay plantillas guardadas.</p>
        </UPageCard>
      </div>
    </div>

    <UPageCard v-if="report" variant="subtle" class="min-w-0 max-w-full overflow-hidden">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><p class="font-semibold">4. Vista previa</p><p class="text-sm text-muted">{{ report.summary.count }} registros · {{ query.date_from }} al {{ query.date_to }}</p></div>
          <div class="flex gap-2"><UButton label="Excel" icon="i-lucide-sheet" color="neutral" variant="outline" @click="exportExcel" /><UButton label="CSV" icon="i-lucide-download" color="neutral" variant="outline" @click="exportCsv" /></div>
        </div>
      </template>
      <UAlert v-if="report.summary.count > report.rows.length" class="mb-3" color="warning" icon="i-lucide-triangle-alert" title="Se alcanzó el límite de filas" :description="`El resumen contempla ${report.summary.count.toLocaleString('es-AR')} registros, pero la vista y el CSV muestran hasta ${report.rows.length.toLocaleString('es-AR')}. Ajustá el período o los filtros para ver otro tramo.`" />
      <div v-if="selectedVisualizations.includes('KPIS')" class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UPageCard v-for="(values, currency) in report.summary.by_currency" :key="currency" variant="subtle" class="min-w-0">
          <p class="text-xs font-semibold uppercase text-muted">{{ currency }} · {{ values.count }} registros</p>
          <p class="mt-2 text-xl font-bold">{{ formatCurrency(values.total, currency) }}</p>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span class="text-success">Cobrado {{ formatCurrency(values.paid, currency) }}</span><span class="text-warning">Pendiente {{ formatCurrency(values.pending, currency) }}</span></div>
        </UPageCard>
        <UPageCard v-if="!Object.keys(report.summary.by_currency).length" variant="subtle" class="text-sm text-muted">Sin importes para mostrar en el período.</UPageCard>
      </div>
      <UPageCard v-if="selectedVisualizations.includes('CHART')" variant="subtle" class="mb-5 min-w-0">
        <template #header><div><p class="font-semibold">{{ chartTypeOptions.find(item => item.value === chartType)?.label }} por {{ groupOptions.find(item => item.value === query.group_by)?.label.toLowerCase() }}</p><p class="text-xs text-muted">Total, cobrado y pendiente{{ query.currency_code === 'ALL' ? ' · valores de distintas monedas no se mezclan en los indicadores' : ` · ${query.currency_code}` }}</p></div></template>
        <UAlert v-if="chartType === 'DONUT' && (query.currency_code === 'ALL' || query.group_by === 'CURRENCY')" color="info" icon="i-lucide-info" title="Ajustá los filtros para usar una dona" :description="query.currency_code === 'ALL' ? 'El gráfico de dona representa proporciones y requiere una sola moneda. Seleccioná ARS o USD en los filtros.' : 'La dona requiere agrupar por una dimensión como mes, cliente o vendedor, no por moneda.'" />
        <div v-else-if="visualizedGroups.length" class="h-80 min-w-0"><ClientOnly><VChart :option="chartOption" autoresize /></ClientOnly></div>
        <div v-else class="flex h-48 items-center justify-center text-sm text-muted">No hay datos para graficar con estos filtros.</div>
      </UPageCard>
      <AsteriskTable v-if="selectedVisualizations.includes('TABLE')" compact class="min-w-0 max-w-full" storage-key="report-builder-sales-preview" :data="rows" :columns="columns" :filter-fields="quickFilters" :sort-fields="sortFields" search-placeholder="Buscar en los resultados..." />
    </UPageCard>
  </UPage>

  <UModal v-model:open="showDeleteTemplateModal" title="Eliminar plantilla" description="Se eliminará la configuración guardada. Los datos del sistema no se modifican.">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancelar" color="neutral" variant="outline" @click="showDeleteTemplateModal = false" />
        <UButton label="Eliminar" color="error" icon="i-lucide-trash-2" :loading="!!deletingId" :disabled="!templatePendingDelete" @click="templatePendingDelete && deleteTemplate(templatePendingDelete)" />
      </div>
    </template>
  </UModal>
</template>
