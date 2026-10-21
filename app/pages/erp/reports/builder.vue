<script setup lang="ts">
import { useManagementReportsService, type ManagementReportQuery } from '~/modulos/erp/management-reports/management-reports.service'
import type { ManagementReportMetadata, ManagementReportResponse, ReportCanvasComponent, ReportCanvasComponentType, ReportCanvasDimension, ReportCanvasMetric, ReportChartType, ReportTemplateColumn, ReportVisualization, SavedManagementReportTemplate } from '~/modulos/erp/management-reports/management-reports.types'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import * as XLSX from 'xlsx'
import { VueDraggable } from 'vue-draggable-plus'

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
const canvasComponents = ref<ReportCanvasComponent[]>([
  { id: 'default-kpi', type: 'KPI', title: 'Resumen de ventas', dimension: 'MONTH', metric: 'TOTAL', width: 12 },
  { id: 'default-chart', type: 'BAR', title: 'Ventas por período', dimension: 'MONTH', metric: 'TOTAL', width: 6 },
  { id: 'default-table', type: 'TABLE', title: 'Detalle de ventas', dimension: 'MONTH', metric: 'TOTAL', width: 12 },
])
const selectedComponentId = ref('default-chart')
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
const componentTypeOptions: Array<{ label: string; value: ReportCanvasComponentType; icon: string }> = [
  { label: 'Indicador', value: 'KPI', icon: 'i-lucide-sigma' },
  { label: 'Columnas', value: 'BAR', icon: 'i-lucide-chart-column' },
  { label: 'Líneas', value: 'LINE', icon: 'i-lucide-chart-no-axes-combined' },
  { label: 'Dona', value: 'DONUT', icon: 'i-lucide-chart-pie' },
  { label: 'Tabla', value: 'TABLE', icon: 'i-lucide-table' },
]
const dimensionOptions: Array<{ label: string; value: ReportCanvasDimension }> = [
  { label: 'Mes', value: 'MONTH' }, { label: 'Día', value: 'DAY' }, { label: 'Cliente', value: 'PARTY' },
  { label: 'Vendedor', value: 'SELLER' }, { label: 'Moneda', value: 'CURRENCY' }, { label: 'Estado de cobro', value: 'PAYMENT_STATE' },
]
const metricOptions: Array<{ label: string; value: ReportCanvasMetric }> = [
  { label: 'Importe total', value: 'TOTAL' }, { label: 'Importe cobrado', value: 'PAID' },
  { label: 'Importe pendiente', value: 'PENDING' }, { label: 'Cantidad de registros', value: 'COUNT' },
]
const widthOptions = [{ label: '1/3', value: 4 }, { label: '1/2', value: 6 }, { label: '2/3', value: 8 }, { label: 'Completo', value: 12 }]
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
const canGenerate = computed(() => query.date_from <= query.date_to && selectedColumns.value.length > 0 && canvasComponents.value.length > 0)
const visualizedGroups = computed(() => report.value?.grouped_by_currency ?? [])
const selectedComponent = computed(() => canvasComponents.value.find(component => component.id === selectedComponentId.value) ?? null)
const componentLabel = (type: ReportCanvasComponentType) => componentTypeOptions.find(item => item.value === type)?.label ?? type
function dimensionLabel(row: ReportRow, dimension: ReportCanvasDimension) {
  if (dimension === 'MONTH') return String(row.date).slice(0, 7)
  if (dimension === 'DAY') return new Date(row.date).toLocaleDateString('es-AR')
  if (dimension === 'PARTY') return row.party_name || 'Sin cliente'
  if (dimension === 'SELLER') return row.seller_name || 'Sin vendedor'
  if (dimension === 'CURRENCY') return row.currency_code || 'Sin moneda'
  return paymentStateLabel(row.payment_state)
}
function metricValue(row: ReportRow, metric: ReportCanvasMetric) {
  if (metric === 'PAID') return Number(row.paid_amount) || 0
  if (metric === 'PENDING') return Number(row.pending_amount) || 0
  if (metric === 'COUNT') return 1
  return Number(row.amount) || 0
}
function componentGroups(component: ReportCanvasComponent) {
  const buckets = new Map<string, { label: string; currency: string; value: number; count: number }>()
  for (const row of rows.value) {
    const label = dimensionLabel(row, component.dimension)
    const currency = row.currency_code || 'ARS'
    const key = `${currency}\u0000${label}`
    const current = buckets.get(key) ?? { label, currency, value: 0, count: 0 }
    current.value += metricValue(row, component.metric)
    current.count += 1
    buckets.set(key, current)
  }
  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}
function componentChartOption(component: ReportCanvasComponent) {
  const groups = componentGroups(component)
  if (component.type === 'DONUT') {
    if (query.currency_code === 'ALL' || new Set(groups.map(item => item.currency)).size > 1) return {}
    const currency = groups[0]?.currency ?? query.currency_code
    return { tooltip: { trigger: 'item', formatter: (item: any) => `${item.name}<br/>${component.metric === 'COUNT' ? item.value : formatCurrency(item.value, currency)}` }, legend: { type: 'scroll', bottom: 0 }, series: [{ type: 'pie', radius: ['42%', '72%'], center: ['50%', '45%'], itemStyle: { borderRadius: 6, borderColor: 'var(--ui-bg)', borderWidth: 2 }, label: { formatter: '{b}: {d}%' }, data: groups.map(item => ({ name: item.label, value: item.value })) }] }
  }
  const categories = [...new Set(groups.map(item => item.label))]
  const currencies = [...new Set(groups.map(item => item.currency))]
  const series = currencies.map(currency => ({
    name: currency,
    type: component.type === 'LINE' ? 'line' : 'bar',
    smooth: true,
    data: categories.map(label => groups.find(item => item.label === label && item.currency === currency)?.value ?? 0),
  }))
  const displayMetric = component.metric === 'COUNT' ? (value: number) => value.toLocaleString('es-AR') : (value: number, currency: string) => formatCurrency(value, currency)
  return {
    tooltip: { trigger: 'axis', formatter: (params: any[]) => [params[0]?.axisValue, ...params.map(item => `${item.marker}${item.seriesName}: ${displayMetric(item.value, item.seriesName)}`)].join('<br/>') }, legend: { bottom: 0, type: 'scroll' },
    grid: { left: 52, right: 18, top: 18, bottom: 60, containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: categories.length > 8 ? 35 : 0, hideOverlap: true } },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) } },
    series: series.map(item => ({ ...item, ...(component.type === 'BAR' ? { itemStyle: { borderRadius: [5, 5, 0, 0] } } : {}) })),
  }
}
function addComponent(type: ReportCanvasComponentType) {
  const count = canvasComponents.value.filter(item => item.type === type).length + 1
  const titles: Record<ReportCanvasComponentType, string> = { KPI: 'Indicador', BAR: 'Gráfico de columnas', LINE: 'Gráfico de líneas', DONUT: 'Gráfico de dona', TABLE: 'Tabla de detalle' }
  const component: ReportCanvasComponent = { id: crypto.randomUUID(), type, title: `${titles[type]} ${count}`, dimension: query.group_by as ReportCanvasDimension, metric: type === 'KPI' ? 'TOTAL' : 'TOTAL', width: type === 'KPI' ? 4 : type === 'TABLE' ? 12 : 6 }
  canvasComponents.value.push(component)
  selectedComponentId.value = component.id
}
function changeComponentType(type: ReportCanvasComponentType) {
  if (!selectedComponent.value) return
  selectedComponent.value.type = type
  if (type === 'KPI') selectedComponent.value.width = Math.min(selectedComponent.value.width, 6) as 4 | 6
  if (type === 'TABLE') selectedComponent.value.width = 12
}
function removeComponent(id: string) {
  canvasComponents.value = canvasComponents.value.filter(component => component.id !== id)
  if (selectedComponentId.value === id) selectedComponentId.value = canvasComponents.value[0]?.id ?? ''
}
function duplicateComponent(component: ReportCanvasComponent) {
  const copy = { ...component, id: crypto.randomUUID(), title: `${component.title} (copia)` }
  const index = canvasComponents.value.findIndex(item => item.id === component.id)
  canvasComponents.value.splice(index + 1, 0, copy)
  selectedComponentId.value = copy.id
}

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
  canvasComponents.value = template.components?.length ? template.components.map(item => ({ ...item })) : [
    ...(template.visualizations?.includes('KPIS') ?? true ? [{ id: crypto.randomUUID(), type: 'KPI' as const, title: 'Resumen de ventas', dimension: 'MONTH' as const, metric: 'TOTAL' as const, width: 12 as const }] : []),
    ...(template.visualizations?.includes('CHART') ?? true ? [{ id: crypto.randomUUID(), type: template.chart_type ?? 'BAR', title: 'Ventas por período', dimension: (template.query.group_by as ReportCanvasDimension) ?? 'MONTH', metric: 'TOTAL' as const, width: 6 as const }] : []),
    ...(template.visualizations?.includes('TABLE') ?? true ? [{ id: crypto.randomUUID(), type: 'TABLE' as const, title: 'Detalle de ventas', dimension: 'MONTH' as const, metric: 'TOTAL' as const, width: 12 as const }] : []),
  ]
  selectedComponentId.value = canvasComponents.value[0]?.id ?? ''
  Object.assign(query, template.query)
  void loadReport()
}

async function saveTemplate() {
  if (templateName.value.trim().length < 2 || !selectedColumns.value.length) return
  saving.value = true
  try {
    const saved = await service.saveTemplate({
      ...(editingId.value ? { id: editingId.value } : {}),
      name: templateName.value.trim(), source: 'SALES', columns: selectedColumns.value, visualizations: [...new Set(canvasComponents.value.map(component => component.type === 'KPI' ? 'KPIS' : component.type === 'TABLE' ? 'TABLE' : 'CHART'))] as ReportVisualization[], chart_type: chartType.value, components: canvasComponents.value.map(component => ({ ...component })), query: { ...query }, shared: shareTemplate.value,
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

    <UPageCard variant="subtle" class="min-w-0 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><p class="font-semibold">Lienzo del reporte</p><p class="text-sm text-muted">Agregá visuales, arrastralos para ordenarlos y seleccioná uno para editarlo.</p></div>
        <div class="flex flex-wrap gap-2">
          <UButton v-for="item in componentTypeOptions" :key="item.value" :label="item.label" :icon="item.icon" color="neutral" variant="outline" size="sm" @click="addComponent(item.value)" />
        </div>
      </div>

      <div class="grid min-w-0 items-start gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <aside class="space-y-4">
          <UPageCard variant="subtle" class="space-y-4">
            <div><p class="font-semibold">Datos</p><p class="text-xs text-muted">Ventas · {{ auth.selectedCompany?.name ?? 'empresa actual' }}</p></div>
            <UFormField label="Registros de"><USelectMenu v-model="query.basis" :items="basisOptions" value-key="value" class="w-full" /></UFormField>
            <div class="grid grid-cols-2 gap-2"><UFormField label="Desde"><UInput v-model="query.date_from" type="date" class="w-full" /></UFormField><UFormField label="Hasta"><UInput v-model="query.date_to" type="date" class="w-full" /></UFormField></div>
            <UFormField label="Moneda"><USelectMenu v-model="query.currency_code" :items="currencyOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Estado de cobro"><USelectMenu v-model="query.payment_state" :items="paymentOptions" value-key="value" :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
            <UFormField label="Cliente"><USelectMenu v-model="query.party_id" :items="partyOptions" value-key="value" searchable class="w-full" /></UFormField>
            <UFormField label="Vendedor"><USelectMenu v-model="query.seller_id" :items="sellerOptions" value-key="value" searchable :disabled="query.basis !== 'SALES_ORDER'" class="w-full" /></UFormField>
            <UFormField label="Producto"><USelectMenu v-model="query.product_id" :items="productOptions" value-key="value" searchable :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
            <UFormField label="Punto de venta"><USelectMenu v-model="query.point_of_sale_id" :items="pointOptions" value-key="value" searchable :disabled="query.basis === 'COLLECTION'" class="w-full" /></UFormField>
            <template v-if="query.basis === 'SALES_ORDER'"><UFormField label="Facturación"><USelectMenu v-model="query.invoicing_state" :items="progressOptions" value-key="value" class="w-full" /></UFormField><UFormField label="Entrega"><USelectMenu v-model="query.delivery_state" :items="progressOptions" value-key="value" class="w-full" /></UFormField></template>
            <UAlert v-if="query.date_from > query.date_to" color="error" icon="i-lucide-calendar-x" title="Período inválido" description="La fecha inicial debe ser anterior a la final." />
            <UButton block label="Actualizar datos" icon="i-lucide-refresh-cw" :loading="loading" :disabled="!canGenerate" @click="loadReport" />
          </UPageCard>

          <UPageCard variant="subtle">
            <template #header><div><p class="font-semibold">Campos disponibles</p><p class="text-xs text-muted">Usalos en las propiedades del visual seleccionado.</p></div></template>
            <p class="mb-2 text-xs font-semibold uppercase text-muted">Dimensiones</p>
            <div class="mb-4 flex flex-wrap gap-1.5"><UBadge v-for="field in dimensionOptions" :key="field.value" color="neutral" variant="subtle">{{ field.label }}</UBadge></div>
            <p class="mb-2 text-xs font-semibold uppercase text-muted">Medidas</p>
            <div class="flex flex-wrap gap-1.5"><UBadge v-for="field in metricOptions" :key="field.value" color="primary" variant="subtle">{{ field.label }}</UBadge></div>
          </UPageCard>
        </aside>

        <section class="min-w-0 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-default bg-elevated/30 px-4 py-3">
            <div><p class="font-semibold">{{ templateName || 'Reporte sin título' }}</p><p class="text-xs text-muted">{{ report ? `${report.summary.count.toLocaleString('es-AR')} registros · ${query.date_from} al ${query.date_to}` : 'Generá los datos para ver los visuales' }}</p></div>
            <div class="flex gap-2"><UButton label="Excel" icon="i-lucide-sheet" color="neutral" variant="outline" size="sm" :disabled="!report" @click="exportExcel" /><UButton label="CSV" icon="i-lucide-download" color="neutral" variant="outline" size="sm" :disabled="!report" @click="exportCsv" /></div>
          </div>
          <UAlert v-if="report && report.summary.count > report.rows.length" color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Vista limitada a 5.000 filas" :description="`El resumen considera ${report.summary.count.toLocaleString('es-AR')} registros; los gráficos y la tabla usan las primeras ${report.rows.length.toLocaleString('es-AR')}. Reducí el período o aplicá filtros para analizar un tramo específico.`" />
          <div v-if="!canvasComponents.length" class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"><UIcon name="i-lucide-layout-dashboard" class="mb-3 size-9 text-muted"/><p class="font-semibold">El lienzo está vacío</p><p class="mt-1 text-sm text-muted">Agregá un indicador, gráfico o tabla desde la barra superior.</p></div>
          <VueDraggable v-else v-model="canvasComponents" :animation="180" handle=".report-drag-handle" class="grid grid-cols-12 gap-3">
            <UPageCard v-for="component in canvasComponents" :key="component.id" variant="subtle" class="relative min-w-0 cursor-pointer" :class="[`col-span-12 ${component.width === 4 ? 'lg:col-span-4' : component.width === 6 ? 'lg:col-span-6' : component.width === 8 ? 'lg:col-span-8' : 'lg:col-span-12'}`, selectedComponentId === component.id ? 'ring-2 ring-primary' : 'hover:border-primary/50']" @click="selectedComponentId = component.id">
              <template #header><div class="flex min-w-0 items-center gap-2"><UButton icon="i-lucide-grip-vertical" color="neutral" variant="ghost" size="xs" class="report-drag-handle cursor-grab" aria-label="Arrastrar para ordenar" @click.stop/><div class="min-w-0 flex-1"><p class="truncate font-semibold">{{ component.title }}</p><p class="text-xs text-muted">{{ componentLabel(component.type) }}<template v-if="component.type !== 'KPI'"> · {{ dimensionOptions.find(item => item.value === component.dimension)?.label }} · {{ metricOptions.find(item => item.value === component.metric)?.label }}</template></p></div><UBadge v-if="selectedComponentId === component.id" color="primary" variant="subtle">Seleccionado</UBadge></div></template>
              <template v-if="report">
                <div v-if="component.type === 'KPI'" class="grid grid-cols-1 gap-2 sm:grid-cols-2"><div v-for="(values, currency) in report.summary.by_currency" :key="currency" class="rounded-lg bg-elevated/50 p-3"><p class="text-xs font-semibold uppercase text-muted">{{ currency }} · {{ values.count }} registros</p><p class="mt-1 text-xl font-bold">{{ formatCurrency(values[component.metric === 'PAID' ? 'paid' : component.metric === 'PENDING' ? 'pending' : 'total'], currency) }}</p><p v-if="component.metric === 'TOTAL'" class="mt-1 text-xs text-muted">Cobrado {{ formatCurrency(values.paid, currency) }} · Pendiente {{ formatCurrency(values.pending, currency) }}</p></div><p v-if="!Object.keys(report.summary.by_currency).length" class="text-sm text-muted">Sin datos para mostrar.</p></div>
                <div v-else-if="component.type === 'TABLE'" class="min-w-0 max-w-full overflow-hidden" @click.stop><AsteriskTable compact class="min-w-0 max-w-full" :storage-key="`report-builder-${component.id}`" :data="rows" :columns="columns" :filter-fields="quickFilters" :sort-fields="sortFields" search-placeholder="Buscar en los resultados..." /></div>
                <UAlert v-else-if="component.type === 'DONUT' && query.currency_code === 'ALL'" color="info" variant="subtle" icon="i-lucide-info" title="La dona necesita una moneda" description="Elegí ARS o USD en el panel Datos para evitar comparar importes de monedas diferentes." />
                <div v-else-if="rows.length" class="h-64 min-w-0"><ClientOnly><VChart :option="componentChartOption(component)" autoresize /></ClientOnly></div>
                <div v-else class="flex h-40 items-center justify-center text-sm text-muted">No hay datos para graficar con estos filtros.</div>
              </template>
              <div v-else class="flex h-40 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted">Generá los datos para previsualizar este componente.</div>
            </UPageCard>
          </VueDraggable>
        </section>

        <aside class="space-y-4">
          <UPageCard variant="subtle" class="space-y-4">
            <template #header><div><p class="font-semibold">Propiedades</p><p class="text-xs text-muted">Configuración del elemento seleccionado.</p></div></template>
            <p v-if="!selectedComponent" class="text-sm text-muted">Seleccioná un visual en el lienzo para editarlo.</p>
            <template v-else>
              <UFormField label="Título"><UInput v-model="selectedComponent.title" maxlength="80" class="w-full" /></UFormField>
              <UFormField label="Tipo de visual"><USelectMenu :model-value="selectedComponent.type" :items="componentTypeOptions" value-key="value" class="w-full" @update:model-value="changeComponentType" /></UFormField>
              <UFormField label="Ancho en el lienzo"><USelectMenu v-model="selectedComponent.width" :items="widthOptions" value-key="value" class="w-full" /></UFormField>
              <template v-if="selectedComponent.type !== 'KPI' && selectedComponent.type !== 'TABLE'"><UFormField label="Agrupar por"><USelectMenu v-model="selectedComponent.dimension" :items="dimensionOptions" value-key="value" class="w-full" /></UFormField><UFormField label="Medida"><USelectMenu v-model="selectedComponent.metric" :items="metricOptions" value-key="value" class="w-full" /></UFormField></template>
              <template v-if="selectedComponent.type === 'TABLE'"><p class="text-xs text-muted">Columnas</p><label v-for="column in columnOptions" :key="column.key" class="flex items-center gap-2 text-sm"><UCheckbox :model-value="selectedColumns.includes(column.key)" @update:model-value="toggleColumn(column.key, $event)"/><span>{{ column.label }}</span></label></template>
              <div class="flex gap-2 border-t border-default pt-3"><UButton block label="Duplicar" icon="i-lucide-copy" color="neutral" variant="outline" @click="duplicateComponent(selectedComponent)"/><UButton block label="Eliminar" icon="i-lucide-trash-2" color="error" variant="outline" @click="removeComponent(selectedComponent.id)"/></div>
            </template>
          </UPageCard>

          <UPageCard variant="subtle">
            <template #header><div><p class="font-semibold">Guardar reporte</p><p class="text-xs text-muted">Guarda filtros y diseño, nunca los datos.</p></div></template>
            <div class="space-y-3"><UFormField label="Nombre"><UInput v-model="templateName" maxlength="100" placeholder="Ej.: Ventas cobradas del mes" class="w-full" /></UFormField><label class="flex items-center gap-3 rounded-lg border border-default p-3"><USwitch v-model="shareTemplate"/><span class="text-sm">Compartir con usuarios de la empresa</span></label><UButton block :label="editingId ? 'Actualizar' : 'Guardar plantilla'" icon="i-lucide-save" :loading="saving" :disabled="templateName.trim().length < 2 || !canvasComponents.length" @click="saveTemplate"/></div>
          </UPageCard>
          <UPageCard variant="subtle">
            <template #header><div><p class="font-semibold">Reportes guardados</p><p class="text-xs text-muted">Plantillas personales y compartidas.</p></div></template>
            <div v-if="loadingTemplates" class="space-y-2"><USkeleton v-for="item in 3" :key="item" class="h-12"/></div>
            <div v-else-if="templates.length" class="space-y-2"><div v-for="template in templates" :key="template.id" class="flex min-w-0 items-center gap-2 rounded-lg border border-default p-2"><button class="min-w-0 flex-1 text-left" @click="applyTemplate(template)"><p class="truncate text-sm font-medium">{{ template.name }}</p><p class="text-xs text-muted">{{ template.shared ? 'Compartida' : 'Personal' }} · {{ template.components?.length ?? template.visualizations?.length ?? 3 }} visuales</p></button><UButton icon="i-lucide-play" color="neutral" variant="ghost" aria-label="Abrir reporte" @click="applyTemplate(template)"/><UButton v-if="template.is_owner" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Eliminar plantilla" @click="templatePendingDelete = template; showDeleteTemplateModal = true"/></div></div>
            <p v-else class="text-sm text-muted">Todavía no hay reportes guardados.</p>
          </UPageCard>
        </aside>
      </div>
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
