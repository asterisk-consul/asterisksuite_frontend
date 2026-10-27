<script setup lang="ts">
type CategorySummary = { count: number; amountByCurrency: Record<string, number>; byStatus: Record<string, number> }
type SummaryData = {
  period: { from: string; to: string; days: number }
  netInvoicedByCurrency: Record<string, number>
  invoiceCount: number
  quoteCount?: number
  orderCount: number
  remitoCount?: number
  categories: Record<string, CategorySummary>
  daily: Array<{ date: string; counts: Record<string, number> }>
}

const props = defineProps<{
  title: string
  description: string
  endpoint: string
  area: 'sales' | 'purchases'
  orderLabel: string
  showQuotes?: boolean
  showRemitos?: boolean
}>()

const days = ref(30)
const loading = ref(false)
const error = ref('')
const data = ref<SummaryData | null>(null)
const periodOptions = [
  { label: 'Últimos 7 días', value: 7 },
  { label: 'Últimos 30 días', value: 30 },
  { label: 'Últimos 90 días', value: 90 },
]
const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(value)
const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${currency} ${formatNumber(value)}`
  }
}
const formatDate = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`))
const currencyRows = computed(() => Object.entries(data.value?.netInvoicedByCurrency ?? {}).sort(([a], [b]) => a.localeCompare(b)))
const trendDays = computed(() => Math.min(14, data.value?.period.days ?? 14))
const chartCategories = computed(() => props.area === 'sales'
  ? [
      { key: 'INVOICE', label: 'Facturas', color: '#3b82f6' },
      { key: 'CREDIT_NOTE', label: 'Notas de crédito', color: '#f97316' },
      { key: 'DEBIT_NOTE', label: 'Notas de débito', color: '#a855f7' },
      { key: 'QUOTE', label: 'Presupuestos', color: '#22c55e' },
      { key: 'ORDER', label: 'Órdenes de venta', color: '#eab308' },
      { key: 'REMITO', label: 'Remitos', color: '#06b6d4' },
    ]
  : [
      { key: 'INVOICE', label: 'Facturas de compra', color: '#3b82f6' },
      { key: 'CREDIT_NOTE', label: 'Notas de crédito', color: '#f97316' },
      { key: 'DEBIT_NOTE', label: 'Notas de débito', color: '#a855f7' },
      { key: 'ORDER', label: 'Órdenes de compra', color: '#22c55e' },
      { key: 'REMITO', label: 'Remitos de compra', color: '#06b6d4' },
    ])
const trend = computed(() => {
  const periodEnd = data.value?.period.to
  if (!periodEnd) return []
  const counts = new Map(data.value?.daily.map(row => [row.date, row.counts]) ?? [])
  const lastDay = new Date(`${periodEnd}T12:00:00`)
  return Array.from({ length: trendDays.value }, (_, index) => {
    const date = new Date(lastDay)
    date.setDate(date.getDate() - trendDays.value + 1 + index)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { date: key, counts: counts.get(key) ?? {} }
  })
})
const hasTrendActivity = computed(() => trend.value.some(item => chartCategories.value.some(category => (item.counts[category.key] ?? 0) > 0)))
const formatTrendTooltip = (items: any[]) => {
  const heading = String(items?.[0]?.axisValue ?? '')
  const rows = (items ?? []).map(item => String(item.marker) + ' ' + String(item.seriesName) + ': <strong>' + formatNumber(Number(item.value)) + '</strong>')
  return [heading, ...rows].join('<br/>')
}
const trendChart = computed(() => ({
  animation: false,
  color: chartCategories.value.map(category => category.color),
  legend: { top: 0, type: 'scroll', textStyle: { color: '#a1a1aa' } },
  tooltip: {
    trigger: 'axis',
    formatter: formatTrendTooltip,
  },
  grid: { left: 38, right: 12, top: 38, bottom: 30, containLabel: true },
  xAxis: {
    type: 'category',
    data: trend.value.map(item => formatDate(item.date)),
    axisTick: { alignWithLabel: true, lineStyle: { color: '#52525b' } },
    axisLine: { lineStyle: { color: '#52525b' } },
    axisLabel: { color: '#a1a1aa', interval: 1, fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    min: 0,
    minInterval: 1,
    axisLabel: { color: '#a1a1aa', fontSize: 10 },
    splitLine: { lineStyle: { color: '#34343a', type: 'dashed' } },
  },
  series: chartCategories.value.map(category => ({
    name: category.label,
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 7,
    data: trend.value.map(item => item.counts[category.key] ?? 0),
    emphasis: { focus: 'series' },
  })),
}))
const links = computed(() => props.area === 'sales'
  ? [
      ...(props.showQuotes ? [{ label: 'Presupuestos', to: '/erp/budgets', icon: 'i-lucide-file-text' }] : []),
      { label: 'Órdenes de venta', to: '/erp/orders', icon: 'i-lucide-shopping-cart' },
      { label: 'Comprobantes', to: '/erp/sales/comprobantes', icon: 'i-lucide-receipt' },
      { label: 'Remitos', to: '/erp/remitos', icon: 'i-lucide-truck' },
    ]
  : [
      { label: 'Órdenes de compra', to: '/erp/purchases/orders', icon: 'i-lucide-shopping-cart' },
      { label: 'Comprobantes', to: '/erp/purchases/comprobantes', icon: 'i-lucide-receipt' },
      ...(props.showRemitos ? [{ label: 'Remitos de compra', to: '/erp/purchases/remitos', icon: 'i-lucide-truck' }] : []),
    ])

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await $fetch<SummaryData>(props.endpoint, { query: { days: days.value } })
  } catch {
    error.value = 'No se pudo cargar el resumen. Revisá tus permisos o intentá nuevamente.'
  } finally {
    loading.value = false
  }
}

watch(days, load)
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm text-muted">Actividad comercial</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ title }}</h1>
        <p class="mt-1 max-w-2xl text-sm text-muted">{{ description }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="data" class="hidden text-xs text-muted sm:inline">{{ formatDate(data.period.from) }} – {{ formatDate(data.period.to) }}</span>
        <USelect v-model="days" :items="periodOptions" value-key="value" class="w-44" aria-label="Período del resumen" />
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" aria-label="Actualizar resumen" @click="load" />
      </div>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard class="border border-default/70">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-sm text-muted">Facturas confirmadas</p><p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatNumber(data?.invoiceCount ?? 0) }}</p></div>
          <span class="rounded-xl bg-primary/10 p-2.5 text-primary"><UIcon name="i-lucide-file-check-2" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">Comprobantes emitidos en el período</p>
      </UCard>
      <UCard v-if="showQuotes" class="border border-default/70">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-sm text-muted">Presupuestos</p><p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatNumber(data?.quoteCount ?? 0) }}</p></div>
          <span class="rounded-xl bg-info/10 p-2.5 text-info"><UIcon name="i-lucide-file-text" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">Creados dentro del período</p>
      </UCard>
      <UCard class="border border-default/70">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-sm text-muted">{{ orderLabel }}</p><p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatNumber(data?.orderCount ?? 0) }}</p></div>
          <span class="rounded-xl bg-warning/10 p-2.5 text-warning"><UIcon name="i-lucide-shopping-cart" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">Órdenes creadas dentro del período</p>
      </UCard>
      <UCard v-if="showRemitos" class="border border-default/70">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-sm text-muted">Remitos de compra</p><p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatNumber(data?.remitoCount ?? 0) }}</p></div>
          <span class="rounded-xl bg-success/10 p-2.5 text-success"><UIcon name="i-lucide-truck" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">Registrados en el período</p>
      </UCard>
      <UCard class="border border-default/70">
        <div class="flex items-start justify-between gap-3">
          <div><p class="text-sm text-muted">Importe confirmado neto</p><p v-if="currencyRows.length === 0" class="mt-2 text-2xl font-semibold">—</p><p v-for="[currency, amount] in currencyRows" :key="currency" class="mt-2 text-xl font-semibold tabular-nums">{{ formatCurrency(amount, currency) }}</p></div>
          <span class="rounded-xl bg-success/10 p-2.5 text-success"><UIcon name="i-lucide-wallet" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">Separado por moneda; incluye notas de crédito</p>
      </UCard>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <UCard class="border border-default/70">
        <template #header>
          <div><h2 class="font-semibold">Comprobantes por tipo</h2><p class="mt-1 text-sm text-muted">Compará la cantidad diaria de cada comprobante · últimos {{ trendDays }} días</p></div>
        </template>
        <div v-if="loading && !data" class="flex h-44 items-center justify-center"><USkeleton class="h-32 w-full" /></div>
        <div v-else-if="hasTrendActivity" class="h-52 w-full">
          <VChart :option="trendChart" autoresize class="size-full" />
        </div>
        <div v-else class="flex h-52 flex-col items-center justify-center gap-2 text-center">
          <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-7 text-muted" />
          <p class="text-sm font-medium">Sin comprobantes en los últimos {{ trendDays }} días del período</p>
          <p class="text-xs text-muted">Probá ampliar el rango para ver más actividad.</p>
        </div>
      </UCard>

      <UCard class="border border-default/70">
        <template #header><div><h2 class="font-semibold">Accesos rápidos</h2><p class="mt-1 text-sm text-muted">Ir al circuito que necesitás</p></div></template>
        <nav class="flex flex-col gap-2">
          <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="flex items-center justify-between rounded-lg border border-default/70 px-3 py-3 transition hover:border-primary/50 hover:bg-elevated/60">
            <span class="flex items-center gap-3"><UIcon :name="link.icon" class="size-5 text-primary" /><span class="text-sm font-medium">{{ link.label }}</span></span>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />
          </NuxtLink>
        </nav>
        <p class="mt-4 text-xs leading-relaxed text-muted">El importe neto considera solo comprobantes confirmados y se muestra por moneda. Los estados y saldos completos se consultan en sus módulos respectivos.</p>
      </UCard>
    </div>
  </div>
</template>
