<script setup lang="ts">
import { h } from 'vue'
import { Chart, registerables } from 'chart.js'
import { UBadge, UButton } from '#components'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { ProductReportLine, ProductReportLinesPage } from '~/modulos/erp/product-reports/product-report.types'
import { getStatusLabel } from '~/modulos/erp/documents/types/document-statuses'
import { SalesService } from '~/modulos/erp/sales/salesReports.service'
import { PurchasesService } from '~/modulos/erp/purchases/purchases.service'
import { useDataTransferPermissions } from '~/modulos/access-control/composables/useDataTransferPermissions'

const props = defineProps<{ direction: 'sales' | 'purchases' }>()
const route = useRoute()
const { canExport } = useDataTransferPermissions()
Chart.register(...registerables)

interface ProductRow {
  key: string
  productId: string
  productCode: string
  productName: string
  category: string
  unitLabel: string
  currencyCode: string
  quantity: number
  net: number
  taxes: number
  exempt: number
  total: number
  lineCount: number
}

interface CategoryGroup {
  key: string
  category: string
  currencyCode: string
  unitLabel: string
  products: ProductRow[]
  quantity: number
  net: number
  taxes: number
  total: number
}

function validDate(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return
  const parsed = new Date(`${candidate}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? undefined
    : candidate
}

const today = new Date()
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const filters = reactive({
  startDate: validDate(route.query.startDate) ?? validDate(route.query.date_from) ?? `${today.getFullYear()}-01-01`,
  endDate: validDate(route.query.endDate) ?? validDate(route.query.date_to) ?? localDate(today),
  documentTypeFilter: 'ORDER'
})

const title = computed(() => props.direction === 'sales' ? 'Productos vendidos' : 'Productos comprados')
const flowLabel = computed(() => props.direction === 'sales' ? 'ventas' : 'compras')
const partyLabel = computed(() => props.direction === 'sales' ? 'Cliente' : 'Proveedor')
const reportPermission = computed(() => props.direction === 'sales' ? 'sales.reports.export' : 'purchases.reports.export')
const canDownload = computed(() => canExport(reportPermission.value))
const documentOptions = computed(() => props.direction === 'sales'
  ? [
      { label: 'Todos los tipos', value: 'ALL' },
      { label: 'Facturas', value: 'INVOICE' },
      { label: 'Notas de crédito', value: 'CREDIT_NOTE' },
      { label: 'Notas de débito', value: 'DEBIT_NOTE' },
      { label: 'Órdenes de venta (OV)', value: 'ORDER' },
      { label: 'Presupuestos', value: 'QUOTE' },
      { label: 'Remitos', value: 'REMITO' }
    ]
  : [
      { label: 'Todos los tipos', value: 'ALL' },
      { label: 'Facturas de compra', value: 'INVOICE' },
      { label: 'Notas de crédito', value: 'CREDIT_NOTE' },
      { label: 'Notas de débito', value: 'DEBIT_NOTE' },
      { label: 'Órdenes de compra', value: 'ORDER' },
      { label: 'Remitos de compra', value: 'REMITO' }
    ])

const loading = ref(false)
const error = ref('')
const search = ref('')
const products = ref<ProductRow[]>([])
const selectedProduct = ref<ProductRow | null>(null)
const collapsedCategories = reactive<Record<string, boolean>>({})
const lineRows = ref<ProductReportLine[]>([])
const lineLoading = ref(false)
const linePage = ref(1)
const lineTotal = ref(0)
const pageSize = 25
const activeView = ref('detail')
const expandedRows = ref<Record<string, boolean>>({})
const chartCurrency = ref('ARS')
const quantityChartCanvas = ref<HTMLCanvasElement | null>(null)
const amountChartCanvas = ref<HTMLCanvasElement | null>(null)
const distributionChartCanvas = ref<HTMLCanvasElement | null>(null)
let quantityChart: Chart | null = null
let amountChart: Chart | null = null
let distributionChart: Chart | null = null
const chartColors = ['#00c781', '#38bdf8', '#a78bfa', '#f59e0b', '#fb7185', '#2dd4bf', '#94a3b8']
const reportTabs = [
  { label: 'Productos por categoría', value: 'detail', icon: 'i-lucide-list-tree' },
  { label: 'Gráficos', value: 'charts', icon: 'i-lucide-chart-no-axes-combined' }
]
const productExpandedOptions = { getRowCanExpand: () => true }

const filteredProducts = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-AR')
  if (!term) return products.value
  return products.value.filter((row) =>
    `${row.productName} ${row.productCode} ${row.category}`.toLocaleLowerCase('es-AR').includes(term)
  )
})

const groups = computed<CategoryGroup[]>(() => {
  const map = new Map<string, CategoryGroup>()
  for (const product of filteredProducts.value) {
    const key = `${product.category}::${product.currencyCode}::${product.unitLabel}`
    let group = map.get(key)
    if (!group) {
      group = { key, category: product.category, currencyCode: product.currencyCode, unitLabel: product.unitLabel, products: [], quantity: 0, net: 0, taxes: 0, total: 0 }
      map.set(key, group)
    }
    group.products.push(product)
    group.quantity += product.quantity
    group.net += product.net
    group.taxes += product.taxes
    group.total += product.total
  }
  return [...map.values()]
    .map((group) => ({ ...group, products: group.products.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)) }))
    .sort((a, b) => a.category.localeCompare(b.category, 'es') || a.currencyCode.localeCompare(b.currencyCode))
})

const currencyTotals = computed(() => {
  const totals = new Map<string, number>()
  for (const product of filteredProducts.value) {
    totals.set(product.currencyCode, (totals.get(product.currencyCode) ?? 0) + product.net)
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))
})
const chartCurrencyOptions = computed(() => currencyTotals.value.map(([currency]) => ({ label: currency, value: currency })))

const quantityChartProducts = computed(() => {
  const totals = new Map<string, { productName: string; unitLabel: string; quantity: number }>()
  for (const product of filteredProducts.value) {
    const row = totals.get(product.productId) ?? { productName: product.productName, unitLabel: product.unitLabel, quantity: 0 }
    row.quantity += product.quantity
    totals.set(product.productId, row)
  }
  return [...totals.values()].sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity)).slice(0, 8)
})

const amountChartProducts = computed(() => filteredProducts.value
  .filter((product) => product.currencyCode === chartCurrency.value && product.net !== 0)
  .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  .slice(0, 8))

const distributionChartProducts = computed(() => filteredProducts.value
  .filter((product) => product.currencyCode === chartCurrency.value && product.net > 0)
  .sort((a, b) => b.net - a.net))

const uniqueProductCount = computed(() => new Set(filteredProducts.value.map((row) => row.productId)).size)
const uniqueCategoryCount = computed(() => new Set(filteredProducts.value.map((row) => row.category)).size)
const totalLines = computed(() => filteredProducts.value.reduce((sum, row) => sum + row.lineCount, 0))

function normalizeRows(response: any): ProductRow[] {
  return (response?.products ?? []).map((product: any) => {
    const currencyCode = String(product.currencyCode || 'ARS').toUpperCase()
    const net = Number(props.direction === 'sales' ? product.totalSales : product.totalPurchases) || 0
    const taxes = Number(product.totalTaxes) || 0
    const exempt = Number(product.totalExempt) || 0
    return {
      key: `${product.productId}:${currencyCode}`,
      productId: String(product.productId),
      productCode: String(product.productCode || ''),
      productName: String(product.productName || 'Producto sin nombre'),
      category: String(product.productCategory || 'Sin categoría'),
      unitLabel: String(product.unitLabel || ''),
      currencyCode,
      quantity: Number(product.totalQuantity) || 0,
      net,
      taxes,
      exempt,
      total: net + taxes + exempt,
      lineCount: Number(product.transactionCount) || 0
    }
  })
}

async function loadReport() {
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    error.value = 'La fecha Desde debe ser anterior o igual a Hasta.'
    return
  }
  loading.value = true
  error.value = ''
  selectedProduct.value = null
  expandedRows.value = {}
  lineRows.value = []
  lineTotal.value = 0
  try {
    const query = { ...filters }
    const response = props.direction === 'sales'
      ? await SalesService.getSummary(query)
      : await PurchasesService.getSummary(query)
    products.value = normalizeRows(response)
  } catch (cause: any) {
    error.value = cause?.data?.message || cause?.message || 'No se pudo generar el reporte.'
  } finally {
    loading.value = false
  }
}

async function toggleProduct(product: ProductRow) {
  if (selectedProduct.value?.key === product.key) {
    selectedProduct.value = null
    expandedRows.value = {}
    lineRows.value = []
    return
  }
  selectedProduct.value = product
  expandedRows.value = { [product.key]: true }
  lineRows.value = []
  lineTotal.value = 0
  await loadProductLines(product, 1)
}

function isCategoryExpanded(key: string) {
  return collapsedCategories[key] !== true
}

function toggleCategory(group: CategoryGroup) {
  if (isCategoryExpanded(group.key)) {
    collapsedCategories[group.key] = true
    if (selectedProduct.value && group.products.some((product) => product.key === selectedProduct.value?.key)) {
      selectedProduct.value = null
      expandedRows.value = {}
      lineRows.value = []
      lineTotal.value = 0
    }
    return
  }
  delete collapsedCategories[group.key]
}

async function loadProductLines(product: ProductRow, page: number) {
  selectedProduct.value = product
  lineLoading.value = true
  linePage.value = page
  try {
    const response: ProductReportLinesPage = props.direction === 'sales'
      ? await SalesService.getProductReportLines(product.productId, filters, page, pageSize)
      : await PurchasesService.getProductReportLines(product.productId, filters, page, pageSize)
    if (selectedProduct.value?.key !== product.key) return
    lineRows.value = response.items
    linePage.value = response.page
    lineTotal.value = response.total
  } catch (cause: any) {
    error.value = cause?.data?.message || cause?.message || 'No se pudieron cargar los comprobantes del producto.'
    lineRows.value = []
  } finally {
    lineLoading.value = false
  }
}

function formatCurrency(value: number, currency = 'ARS') {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}`
  }
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function productRowId(row: ProductRow) {
  return row.key
}

function lineRowId(row: ProductReportLine) {
  return row.id
}

function productPath(product: ProductRow) {
  return `/productos/${encodeURIComponent(product.productId)}`
}

function documentPath(line: ProductReportLine) {
  const id = encodeURIComponent(line.documentId)
  if (props.direction === 'sales') {
    if (line.documentCategory === 'ORDER') return `/erp/orders/${id}`
    if (line.documentCategory === 'QUOTE') return `/erp/budgets/${id}`
    if (line.documentCategory === 'REMITO') return `/erp/remitos/${id}`
    return `/erp/sales/${id}`
  }

  if (line.documentCategory === 'ORDER') return `/erp/purchases/orders/${id}`
  if (line.documentCategory === 'REMITO') return `/erp/purchases/remitos/${id}`
  return `/erp/purchases/purchases-documents/${id}`
}

function destroyCharts() {
  quantityChart?.destroy()
  amountChart?.destroy()
  distributionChart?.destroy()
  quantityChart = null
  amountChart = null
  distributionChart = null
}

function formatShortAmount(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mil M`
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)} mil`
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)
}

async function renderCharts() {
  await nextTick()
  destroyCharts()
  if (activeView.value !== 'charts') return

  if (quantityChartCanvas.value && quantityChartProducts.value.length) {
    quantityChart = new Chart(quantityChartCanvas.value, {
      type: 'bar',
      data: {
        labels: quantityChartProducts.value.map((product) => `${product.productName} · ${product.unitLabel || 'unid.'}`),
        datasets: [{
          label: props.direction === 'sales' ? 'Cantidad vendida' : 'Cantidad comprada',
          data: quantityChartProducts.value.map((product) => product.quantity),
          backgroundColor: chartColors[0],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { callback: (value) => formatQuantity(Number(value)) }, grid: { color: 'rgba(148,163,184,0.12)' } },
          y: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    })
  }

  if (amountChartCanvas.value && amountChartProducts.value.length) {
    amountChart = new Chart(amountChartCanvas.value, {
      type: 'bar',
      data: {
        labels: amountChartProducts.value.map((product) => product.productName),
        datasets: [{
          label: 'Neto documental',
          data: amountChartProducts.value.map((product) => product.net),
          backgroundColor: amountChartProducts.value.map((_, index) => chartColors[index % chartColors.length]),
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (context) => ` ${formatCurrency(Number(context.parsed.x), chartCurrency.value)}` } }
        },
        scales: {
          x: { ticks: { callback: (value) => formatShortAmount(Number(value)) }, grid: { color: 'rgba(148,163,184,0.12)' } },
          y: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    })
  }

  const topProducts = distributionChartProducts.value.slice(0, 5)
  const otherTotal = distributionChartProducts.value.slice(5).reduce((sum, product) => sum + product.net, 0)
  if (distributionChartCanvas.value && topProducts.length) {
    const labels = [...topProducts.map((product) => product.productName), ...(otherTotal > 0 ? ['Otros'] : [])]
    const values = [...topProducts.map((product) => product.net), ...(otherTotal > 0 ? [otherTotal] : [])]
    distributionChart = new Chart(distributionChartCanvas.value, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: labels.map((_, index) => chartColors[index % chartColors.length]), borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 12, usePointStyle: true } },
          tooltip: { callbacks: { label: (context) => ` ${formatCurrency(Number(context.parsed), chartCurrency.value)}` } }
        }
      }
    })
  }
}

const productColumns = computed<ExtendedColumn<ProductRow>[]>(() => [
  {
    accessorKey: 'productName',
    header: 'Producto',
    meta: { label: 'Producto', filter: false },
    cell: ({ row }) => h('div', { class: 'min-w-40 py-1' }, [
      h(UButton, {
        to: productPath(row.original),
        label: row.original.productName,
        'aria-label': `Abrir producto ${row.original.productName}`,
        variant: 'link',
        color: 'primary',
        size: 'sm',
        class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left font-medium'
      }),
      h('p', { class: 'text-xs text-muted' }, row.original.productCode ? `Código ${row.original.productCode}` : 'Sin código')
    ])
  },
  { accessorKey: 'quantity', header: 'Unidades', meta: { label: 'Unidades', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, `${formatQuantity(row.original.quantity)} ${row.original.unitLabel}`.trim()) },
  { accessorKey: 'net', header: 'Neto', meta: { label: 'Neto', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, formatCurrency(row.original.net, row.original.currencyCode)) },
  { accessorKey: 'taxes', header: 'Impuestos', meta: { label: 'Impuestos', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums text-muted' }, formatCurrency(row.original.taxes, row.original.currencyCode)) },
  { accessorKey: 'total', header: 'Total', meta: { label: 'Total', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right font-semibold tabular-nums' }, formatCurrency(row.original.total, row.original.currencyCode)) },
  { accessorKey: 'lineCount', header: 'Renglones', meta: { label: 'Renglones', filter: false }, cell: ({ row }) => h('span', { class: 'block text-center tabular-nums' }, String(row.original.lineCount)) },
  {
    accessorKey: 'actions',
    header: '',
    meta: { label: 'Acción', filter: false, disableColumnVisibility: true },
    cell: ({ row }) => h(UButton, {
      size: 'xs',
      variant: selectedProduct.value?.key === row.original.key ? 'soft' : 'ghost',
      color: 'primary',
      icon: selectedProduct.value?.key === row.original.key ? 'i-lucide-chevron-up' : 'i-lucide-file-search',
      label: selectedProduct.value?.key === row.original.key ? 'Ocultar' : 'Ver comprobantes',
      'data-row-action': '',
      onClick: (event: Event) => { event.stopPropagation(); void toggleProduct(row.original) }
    })
  }
])

const lineColumns = computed<ExtendedColumn<ProductReportLine>[]>(() => [
  { accessorKey: 'documentDate', header: 'Fecha', meta: { label: 'Fecha', filter: false }, cell: ({ row }) => formatDate(row.original.documentDate) },
  {
    accessorKey: 'documentTypeName',
    header: 'Documento',
    meta: { label: 'Documento', filter: false },
    cell: ({ row }) => h('div', { class: 'min-w-32' }, [
      h(UButton, {
        to: documentPath(row.original),
        label: `${row.original.documentTypeCode || row.original.documentTypeName} · ${row.original.documentReference || row.original.documentNumber}`,
        'aria-label': `Abrir ${row.original.documentTypeName} ${row.original.documentReference || row.original.documentNumber}`,
        variant: 'link',
        color: 'primary',
        size: 'xs',
        trailingIcon: 'i-lucide-arrow-up-right',
        class: 'h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left font-semibold'
      }),
      h('p', { class: 'text-xs text-muted' }, row.original.documentTypeName),
      h(UBadge, { size: 'xs', color: 'neutral', variant: 'subtle', class: 'mt-1' }, () => getStatusLabel(row.original.documentCategory, row.original.documentStatus))
    ])
  },
  { accessorKey: 'partyName', header: partyLabel.value, meta: { label: partyLabel.value, filter: false } },
  { accessorKey: 'quantity', header: 'Cantidad', meta: { label: 'Cantidad', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, formatQuantity(row.original.quantity)) },
  { accessorKey: 'netAmount', header: 'Neto', meta: { label: 'Neto', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right tabular-nums' }, formatCurrency(row.original.netAmount, row.original.currencyCode)) },
  { accessorKey: 'totalAmount', header: 'Total', meta: { label: 'Total', filter: false }, cell: ({ row }) => h('span', { class: 'block text-right font-medium tabular-nums' }, formatCurrency(row.original.totalAmount, row.original.currencyCode)) }
])

function exportCsv() {
  const rows = [
    ['Categoría', 'Código', 'Producto', 'Moneda', 'Unidades', 'Neto', 'Impuestos', 'Total', 'Renglones'],
    ...filteredProducts.value.map((row) => [row.category, row.productCode, row.productName, row.currencyCode, row.quantity, row.net, row.taxes, row.total, row.lineCount])
  ]
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${props.direction}-productos-${filters.startDate}-${filters.endDate}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

watch(search, () => {
  selectedProduct.value = null
  expandedRows.value = {}
  lineRows.value = []
})
watch([activeView, filteredProducts, chartCurrency], () => {
  if (activeView.value === 'charts') void renderCharts()
  else destroyCharts()
}, { flush: 'post' })
watch(currencyTotals, (totals) => {
  const firstCurrency = totals[0]?.[0]
  if (firstCurrency && !totals.some(([currency]) => currency === chartCurrency.value)) chartCurrency.value = firstCurrency
}, { immediate: true })
onMounted(loadReport)
onBeforeUnmount(destroyCharts)
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 p-4 sm:p-6">
    <section class="rounded-xl border border-default bg-elevated/30 p-4 sm:p-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-highlighted">{{ title }}</h1>
          <p class="mt-1 text-sm text-muted">Analizá unidades e importes por categoría y producto.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle" class="capitalize">{{ flowLabel }} de la empresa activa</UBadge>
          <UButton v-if="canDownload" label="Exportar CSV" icon="i-lucide-download" variant="outline" color="neutral" size="sm" @click="exportCsv" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-end">
        <UFormField label="Desde"><UInput v-model="filters.startDate" type="date" class="w-full" /></UFormField>
        <UFormField label="Hasta"><UInput v-model="filters.endDate" type="date" class="w-full" /></UFormField>
        <UFormField label="Tipo de documento"><USelectMenu v-model="filters.documentTypeFilter" :items="documentOptions" value-key="value" class="w-full" /></UFormField>
        <UButton label="Aplicar filtros" icon="i-lucide-list-filter" :loading="loading" class="w-full justify-center xl:w-auto" @click="loadReport" />
      </div>
      <p class="mt-3 flex items-start gap-2 text-xs text-muted"><UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-primary" />El neto corresponde a documentos, no a cobros, e incluye todos sus estados. OV, remitos y facturas se analizan por separado para evitar duplicar el circuito.</p>
    </section>

    <UAlert v-if="error" color="error" variant="soft" title="No se pudo cargar el reporte" :description="error" icon="i-lucide-triangle-alert" />

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <UPageCard variant="subtle" class="min-w-0"><p class="text-xs text-muted">Productos</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ uniqueProductCount.toLocaleString('es-AR') }}</p><p class="text-xs text-muted">con movimientos en el período</p></UPageCard>
      <UPageCard variant="subtle" class="min-w-0"><p class="text-xs text-muted">Categorías</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ uniqueCategoryCount.toLocaleString('es-AR') }}</p><p class="text-xs text-muted">según catálogo de productos</p></UPageCard>
      <UPageCard variant="subtle" class="min-w-0"><p class="text-xs text-muted">Renglones</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ totalLines.toLocaleString('es-AR') }}</p><p class="text-xs text-muted">en {{ flowLabel }}</p></UPageCard>
      <UPageCard variant="subtle" class="min-w-0"><p class="text-xs text-muted">Neto documental por moneda</p><div v-if="currencyTotals.length" class="mt-2 flex flex-wrap gap-2"><UBadge v-for="([currency, amount]) in currencyTotals" :key="currency" color="neutral" variant="subtle" class="tabular-nums">{{ formatCurrency(amount, currency) }}</UBadge></div><p v-else class="mt-2 text-sm text-muted">Sin importes para mostrar</p></UPageCard>
    </section>

    <UTabs v-model="activeView" :items="reportTabs" :content="false" variant="link" class="w-full" />

    <section v-if="activeView === 'detail'" class="min-w-0 rounded-xl border border-default bg-elevated/20 p-4 sm:p-5">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 class="font-semibold text-highlighted">Productos por categoría</h2><p class="mt-1 text-sm text-muted">Expandí el comprobante desde el renglón del producto para verlo justo debajo.</p></div>
        <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar producto o categoría" class="w-full sm:max-w-sm" />
      </div>

      <div v-if="loading" class="grid gap-3"><USkeleton v-for="index in 4" :key="index" class="h-16 w-full rounded-lg" /></div>
      <div v-else-if="!groups.length" class="rounded-lg border border-dashed border-default px-4 py-12 text-center"><UIcon name="i-lucide-package-search" class="mx-auto size-8 text-muted" /><p class="mt-3 font-medium text-highlighted">No hay productos para estos filtros</p><p class="mt-1 text-sm text-muted">Probá con otro período o tipo de documento.</p></div>
      <div v-else class="flex flex-col gap-3">
        <article v-for="group in groups" :key="group.key" class="overflow-hidden rounded-lg border border-default">
          <button type="button" class="grid w-full gap-3 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" :aria-expanded="isCategoryExpanded(group.key)" @click="toggleCategory(group)">
            <div class="flex min-w-0 items-center gap-2"><UIcon :name="isCategoryExpanded(group.key) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 shrink-0 text-primary" /><UIcon name="i-lucide-folder-tree" class="size-4 shrink-0 text-primary" /><h3 class="truncate font-semibold text-highlighted">{{ group.category }}</h3><UBadge color="neutral" variant="subtle">{{ group.currencyCode }}</UBadge><UBadge v-if="group.unitLabel" color="neutral" variant="outline">{{ group.unitLabel }}</UBadge><span class="text-xs text-muted">{{ group.products.length }} productos</span></div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums sm:justify-end"><span class="text-muted">{{ formatQuantity(group.quantity) }} {{ group.unitLabel || 'unidades' }}</span><span class="font-semibold text-highlighted">Neto {{ formatCurrency(group.net, group.currencyCode) }}</span><span class="text-muted">Impuestos {{ formatCurrency(group.taxes, group.currencyCode) }}</span><span class="text-muted">Total {{ formatCurrency(group.total, group.currencyCode) }}</span></div>
          </button>
          <div v-if="isCategoryExpanded(group.key)" class="min-w-0 overflow-x-auto px-2 sm:px-3">
            <AsteriskTable
              v-model:expanded="expandedRows"
              compact
              hide-toolbar
              hide-footer
              :expanded-options="productExpandedOptions"
              :storage-key="`product-report-${direction}-${group.key}`"
              :data="group.products"
              :columns="productColumns"
              :get-row-id="productRowId"
              :table-min-width="760"
            >
              <template #expanded="{ row }">
                <div v-if="selectedProduct?.key === row.original.key" class="min-w-0 border-t border-default bg-muted/20 px-3 py-2.5 sm:px-4">
                  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <UIcon name="i-lucide-corner-down-right" class="size-4 shrink-0 text-primary" />
                      <p class="truncate text-sm font-medium text-highlighted">Comprobantes de {{ row.original.productName }}</p>
                      <UBadge color="neutral" variant="subtle" size="xs">{{ lineTotal }} renglones</UBadge>
                    </div>
                    <UButton icon="i-lucide-x" aria-label="Cerrar comprobantes" title="Cerrar comprobantes" variant="ghost" color="neutral" size="xs" @click="void toggleProduct(row.original)" />
                  </div>
                  <div v-if="lineLoading" class="space-y-1.5"><USkeleton class="h-8 w-full" /><USkeleton class="h-8 w-full" /></div>
                  <div v-else-if="!lineRows.length" class="rounded-md border border-dashed border-default px-3 py-4 text-center text-sm text-muted">No hay comprobantes del producto en este período.</div>
                  <div v-else class="min-w-0 overflow-x-auto rounded-md border border-default bg-default/40">
                    <AsteriskTable compact hide-toolbar hide-footer :storage-key="`product-report-lines-${direction}-${row.original.productId}`" :data="lineRows" :columns="lineColumns" :get-row-id="lineRowId" :table-min-width="760" />
                  </div>
                  <div v-if="lineTotal > pageSize" class="mt-2 flex justify-end"><UPagination :page="linePage" :items-per-page="pageSize" :total="lineTotal" size="xs" @update:page="(page) => selectedProduct && loadProductLines(selectedProduct, page)" /></div>
                </div>
              </template>
            </AsteriskTable>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="grid min-w-0 gap-4 xl:grid-cols-2">
      <UPageCard variant="subtle" class="min-w-0" :ui="{ body: 'min-w-0' }">
        <template #header><div><h2 class="font-semibold">{{ direction === 'sales' ? 'Cantidad vendida por artículo' : 'Cantidad comprada por artículo' }}</h2><p class="text-sm text-muted">Los 8 artículos con más unidades en el período.</p></div></template>
        <div v-if="loading" class="flex h-64 items-center justify-center"><USkeleton class="h-full w-full" /></div>
        <div v-else-if="!quantityChartProducts.length" class="flex h-64 items-center justify-center text-sm text-muted">No hay cantidades para graficar.</div>
        <div v-else class="h-64 min-w-0"><canvas ref="quantityChartCanvas" /></div>
      </UPageCard>

      <UPageCard variant="subtle" class="min-w-0" :ui="{ body: 'min-w-0' }">
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div><h2 class="font-semibold">Neto por artículo</h2><p class="text-sm text-muted">Top 8 dentro de una moneda; no mezcla monedas ni cobros.</p></div>
            <USelect v-model="chartCurrency" :items="chartCurrencyOptions" value-key="value" class="w-28" size="sm" />
          </div>
        </template>
        <div v-if="loading" class="flex h-64 items-center justify-center"><USkeleton class="h-full w-full" /></div>
        <div v-else-if="!amountChartProducts.length" class="flex h-64 items-center justify-center text-sm text-muted">No hay importes en {{ chartCurrency }} para graficar.</div>
        <div v-else class="h-64 min-w-0"><canvas ref="amountChartCanvas" /></div>
      </UPageCard>

      <UPageCard variant="subtle" class="min-w-0 xl:col-span-2" :ui="{ body: 'min-w-0' }">
        <template #header><div><h2 class="font-semibold">Distribución por artículo</h2><p class="text-sm text-muted">Participación de los importes positivos en {{ chartCurrency }}; los créditos no se mezclan en el anillo.</p></div></template>
        <div v-if="loading" class="flex h-72 items-center justify-center"><USkeleton class="h-full w-full max-w-xl" /></div>
        <div v-else-if="!distributionChartProducts.length" class="flex h-72 items-center justify-center text-sm text-muted">No hay importes positivos en {{ chartCurrency }} para graficar.</div>
        <div v-else class="mx-auto h-72 max-w-3xl min-w-0"><canvas ref="distributionChartCanvas" /></div>
      </UPageCard>
    </section>
  </div>
</template>
