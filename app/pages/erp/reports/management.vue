<script setup lang="ts">
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type { ManagementReportMetadata, ManagementReportResponse, PaymentState, ProgressState, ReportBasis, ReportGroupBy } from '~/modulos/erp/management-reports/management-reports.types'

definePageMeta({ middleware: ['auth'] })

const service = useManagementReportsService()
const toast = useToast()
const loading = ref(false)
const report = ref<ManagementReportResponse | null>(null)
const metadata = ref<ManagementReportMetadata | null>(null)
let reloadTimer: ReturnType<typeof setTimeout> | null = null
let requestSequence = 0

const currentDate = new Date()
const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const filters = reactive({
  basis: 'INVOICE' as ReportBasis,
  date_from: isoDate(firstDay),
  date_to: isoDate(currentDate),
  group_by: 'MONTH' as ReportGroupBy,
  payment_state: 'ALL' as PaymentState,
  currency_code: 'ALL',
  party_id: 'ALL',
  seller_id: 'ALL',
  product_id: 'ALL',
  point_of_sale_id: 'ALL',
  invoicing_state: 'ALL' as ProgressState,
  delivery_state: 'ALL' as ProgressState,
})

const basisOptions = [
  { label: 'Órdenes de venta', value: 'SALES_ORDER', description: 'Actividad comercial comprometida', icon: 'i-lucide-shopping-cart' },
  { label: 'Facturas', value: 'INVOICE', description: 'Venta fiscal confirmada', icon: 'i-lucide-receipt' },
  { label: 'Cobros', value: 'COLLECTION', description: 'Dinero efectivamente recibido', icon: 'i-lucide-hand-coins' },
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
const formatCurrency = (value: number, currency = 'ARS') => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(value) || 0)

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { bottom: 0 },
  grid: { left: 60, right: 20, top: 20, bottom: 50 },
  xAxis: { type: 'category', data: report.value?.grouped.map(item => item.label) ?? [] },
  yAxis: { type: 'value' },
  series: [
    { name: 'Total', type: 'bar', data: report.value?.grouped.map(item => item.total) ?? [], itemStyle: { borderRadius: [6, 6, 0, 0] } },
    { name: 'Cobrado', type: 'line', smooth: true, data: report.value?.grouped.map(item => item.paid) ?? [] },
  ],
}))

const productChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 130, right: 28, top: 10, bottom: 30 },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: [...(report.value?.commercial_performance?.products_by_quantity ?? [])].reverse().map(item => item.name),
    axisLabel: { width: 110, overflow: 'truncate' },
  },
  series: [{
    name: 'Unidades',
    type: 'bar',
    data: [...(report.value?.commercial_performance?.products_by_quantity ?? [])].reverse().map(item => item.quantity),
    itemStyle: { borderRadius: [0, 6, 6, 0] },
  }],
}))

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
      payment_state: filters.basis === 'COLLECTION' ? 'ALL' : filters.payment_state,
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

function clearCommercialFilters() {
  filters.party_id = 'ALL'
  filters.seller_id = 'ALL'
  filters.product_id = 'ALL'
  filters.point_of_sale_id = 'ALL'
  filters.invoicing_state = 'ALL'
  filters.delivery_state = 'ALL'
}

function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(loadReport, 350)
}

watch(() => filters.basis, (basis) => {
  if (basis === 'COLLECTION') filters.payment_state = 'ALL'
  if (basis !== 'SALES_ORDER' && filters.group_by === 'SELLER') filters.group_by = 'MONTH'
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
  <UPage class="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 sm:px-6">
    <AppPageHeader title="Reporte gerencial" description="Analizá una fuente por vez para evitar duplicar OV, facturas y cobros">
      <template #links>
        <UButton label="Actualizar reporte" icon="i-lucide-refresh-cw" :loading="loading" @click="loadReport" />
      </template>
    </AppPageHeader>

    <UPageCard variant="subtle" class="relative space-y-5 overflow-hidden">
      <div v-if="loading" class="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/15">
        <div class="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <div>
        <p class="font-semibold">1. Elegí la base del reporte</p>
        <p class="text-sm text-muted">La base es excluyente: los resultados nunca suman OV y facturas entre sí.</p>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          v-for="option in basisOptions"
          :key="option.value"
          type="button"
          class="rounded-xl border p-4 text-left transition"
          :class="filters.basis === option.value ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-default hover:bg-elevated/50'"
          @click="filters.basis = option.value as ReportBasis"
        >
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon :name="option.icon" class="size-5" /></div>
            <div><p class="font-medium">{{ option.label }}</p><p class="text-xs text-muted">{{ option.description }}</p></div>
          </div>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" class="w-full" /></UFormField>
        <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" class="w-full" /></UFormField>
        <UFormField label="Agrupar"><USelect v-model="filters.group_by" :items="availableGroupOptions" class="w-full" /></UFormField>
        <UFormField v-if="filters.basis !== 'COLLECTION'" label="Estado de cobro"><USelect v-model="filters.payment_state" :items="paymentOptions" class="w-full" /></UFormField>
        <UFormField label="Moneda"><USelect v-model="filters.currency_code" :items="currencyOptions" class="w-full" /></UFormField>
      </div>
      <div class="border-t border-default pt-5">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div><p class="font-medium">Filtros comerciales</p><p class="text-xs text-muted">Acotá el resultado sin cambiar la base elegida.</p></div>
          <UButton label="Limpiar" icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="sm" @click="clearCommercialFilters" />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
    </UPageCard>

    <div v-if="!report && loading" class="space-y-4" aria-label="Generando reporte">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
      </div>
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <USkeleton class="h-96 rounded-xl" />
        <USkeleton class="h-96 rounded-xl" />
      </div>
    </div>

    <div
      v-if="report"
      class="relative space-y-6 transition duration-200"
      :class="loading ? 'pointer-events-none opacity-55' : 'opacity-100'"
      :aria-busy="loading"
    >
      <div v-if="loading" class="absolute inset-0 z-10 flex items-start justify-center pt-20">
        <div class="flex items-center gap-2 rounded-full border border-default bg-default/95 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin text-primary" />
          Actualizando reporte
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">{{ selectedBasis?.label }}</p><p class="mt-2 text-2xl font-bold">{{ formatCurrency(report.summary.converted_total) }}</p><p class="text-xs text-muted">{{ report.summary.count }} documentos o movimientos</p></UPageCard>
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Cobrado</p><p class="mt-2 text-2xl font-bold text-success">{{ formatCurrency(report.summary.converted_paid) }}</p></UPageCard>
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Pendiente</p><p class="mt-2 text-2xl font-bold text-warning">{{ formatCurrency(report.summary.converted_pending) }}</p></UPageCard>
        <UPageCard variant="subtle"><p class="text-xs font-semibold uppercase text-muted">Monedas</p><div class="mt-2 space-y-1"><p v-for="(values, currency) in report.summary.by_currency" :key="currency" class="flex justify-between text-sm"><span>{{ currency }}</span><strong>{{ formatCurrency(values.total, currency) }}</strong></p></div></UPageCard>
      </div>

      <UAlert v-if="report.summary.missing_exchange_rate_count" color="warning" icon="i-lucide-triangle-alert" title="Consolidado incompleto" :description="`${report.summary.missing_exchange_rate_count} movimientos no tienen cotización histórica.`" />

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <UPageCard variant="subtle"><template #header><div><p class="font-semibold">Evolución</p><p class="text-xs text-muted">Total y cobrado según la agrupación seleccionada</p></div></template><div class="h-80"><ClientOnly><VChart :option="chartOption" autoresize /></ClientOnly></div></UPageCard>
        <UPageCard variant="subtle"><template #header><p class="font-semibold">Composición por moneda</p></template><div class="space-y-3"><div v-for="(values, currency) in report.summary.by_currency" :key="currency" class="rounded-xl border border-default p-3"><div class="flex justify-between"><strong>{{ currency }}</strong><span class="text-sm">{{ values.count }} movimientos</span></div><p class="mt-2 text-lg font-semibold">{{ formatCurrency(values.total, currency) }}</p><p class="text-xs text-muted">Cobrado {{ formatCurrency(values.paid, currency) }} · Pendiente {{ formatCurrency(values.pending, currency) }}</p></div></div></UPageCard>
      </div>

      <div v-if="report.commercial_performance" class="space-y-4">
        <div>
          <p class="text-lg font-semibold">Rendimiento comercial</p>
          <p class="text-sm text-muted">Los rankings usan únicamente {{ selectedBasis?.label.toLowerCase() }} del período y filtros seleccionados.</p>
        </div>
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <UPageCard variant="subtle">
            <template #header>
              <div><p class="font-semibold">Productos más vendidos</p><p class="text-xs text-muted">Ranking por unidades netas, descontando notas de crédito</p></div>
            </template>
            <div v-if="report.commercial_performance.products_by_quantity.length" class="h-80"><ClientOnly><VChart :option="productChartOption" autoresize /></ClientOnly></div>
            <div v-else class="flex h-80 items-center justify-center text-sm text-muted">No hay productos para los filtros seleccionados.</div>
          </UPageCard>

          <UPageCard variant="subtle" class="overflow-hidden">
            <template #header>
              <div><p class="font-semibold">Productos con mayor facturación</p><p class="text-xs text-muted">Importe neto convertido a ARS con la cotización histórica</p></div>
            </template>
            <div class="max-h-80 overflow-auto">
              <table class="w-full min-w-[520px] text-sm">
                <thead class="sticky top-0 bg-default text-left text-xs uppercase text-muted"><tr><th class="p-3">Producto</th><th class="p-3 text-right">Unidades</th><th class="p-3 text-right">Documentos</th><th class="p-3 text-right">Venta neta</th></tr></thead>
                <tbody><tr v-for="product in report.commercial_performance.products_by_revenue" :key="product.product_id" class="border-t border-default/60"><td class="p-3"><p class="font-medium">{{ product.name }}</p><p v-if="product.sku" class="text-xs text-muted">{{ product.sku }}</p></td><td class="p-3 text-right">{{ product.quantity.toLocaleString('es-AR') }}</td><td class="p-3 text-right">{{ product.document_count }}</td><td class="p-3 text-right font-medium">{{ formatCurrency(product.revenue) }}<UIcon v-if="product.missing_exchange_rate_count" name="i-lucide-triangle-alert" class="ml-1 size-4 text-warning" title="Hay líneas sin cotización histórica" /></td></tr></tbody>
              </table>
            </div>
          </UPageCard>
        </div>

        <UPageCard v-if="report.commercial_performance.sellers.length" variant="subtle" class="overflow-hidden">
          <template #header>
            <div><p class="font-semibold">Desempeño por vendedor</p><p class="text-xs text-muted">Filtrá un vendedor arriba para descubrir sus productos estrella</p></div>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b border-default text-left text-xs uppercase text-muted"><tr><th class="p-3">Vendedor</th><th class="p-3 text-right">Documentos</th><th class="p-3 text-right">Unidades</th><th class="p-3 text-right">Venta</th><th class="p-3 text-right">Cobrado</th></tr></thead>
              <tbody><tr v-for="seller in report.commercial_performance.sellers" :key="seller.seller_id ?? 'none'" class="border-b border-default/60"><td class="p-3 font-medium">{{ seller.name }}</td><td class="p-3 text-right">{{ seller.document_count }}</td><td class="p-3 text-right">{{ seller.quantity.toLocaleString('es-AR') }}</td><td class="p-3 text-right">{{ formatCurrency(seller.revenue) }}</td><td class="p-3 text-right text-success">{{ formatCurrency(seller.paid) }}</td></tr></tbody>
            </table>
          </div>
        </UPageCard>
      </div>

      <UPageCard variant="subtle" class="overflow-hidden">
        <template #header><div><p class="font-semibold">Detalle del reporte</p><p class="text-xs text-muted">Primeros 200 resultados de la base seleccionada</p></div></template>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-sm">
            <thead class="border-b border-default text-left text-xs uppercase text-muted"><tr><th class="p-3">Fecha</th><th class="p-3">Documento</th><th class="p-3">Cliente</th><th class="p-3">Moneda</th><th class="p-3 text-right">Total</th><th class="p-3 text-right">Cobrado</th><th class="p-3 text-right">Pendiente</th><th class="p-3">Estado</th></tr></thead>
            <tbody><tr v-for="row in report.rows" :key="row.id" class="border-b border-default/60 hover:bg-elevated/40"><td class="p-3">{{ new Date(row.date).toLocaleDateString('es-AR') }}</td><td class="p-3 font-medium"><ULink :to="documentRoute(row)" class="text-primary hover:underline">{{ row.label }}</ULink></td><td class="p-3">{{ row.party_name }}</td><td class="p-3">{{ row.currency_code }}</td><td class="p-3 text-right">{{ formatCurrency(row.amount, row.currency_code) }}</td><td class="p-3 text-right text-success">{{ formatCurrency(row.paid_amount, row.currency_code) }}</td><td class="p-3 text-right text-warning">{{ formatCurrency(row.pending_amount, row.currency_code) }}</td><td class="p-3"><UBadge :label="row.payment_state === 'PAID' ? 'Cobrado' : row.payment_state === 'PARTIAL' ? 'Parcial' : 'Pendiente'" variant="subtle" /></td></tr></tbody>
          </table>
        </div>
      </UPageCard>
    </div>
  </UPage>
</template>
