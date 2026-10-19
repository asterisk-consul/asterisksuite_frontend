<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const props = defineProps<{
  data?: {
    meta?: { days: number; documents_from: string }
    quotes: { total: number; totalValue: number }
    orders: { total: number; totalValue: number }
    remitos: { total: number }
    invoices: { total: number; totalValue: number }
    creditNotes: { total: number; totalValue: number }
    debitNotes: { total: number; totalValue: number }
    products?: { total: number; withStock: number; withStockUnits: number; costed: number; uncosted: number; forSale: number; forPurchase: number }
  }
  loading?: boolean
}>()

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const emit = defineEmits<{ (e: 'range-change', days: number): void }>()

// Período de los documentos (los productos son un snapshot actual)
const range = ref(props.data?.meta?.days ?? 30)
const rangeOptions = [
  { label: 'Hoy', value: 1 },
  { label: '7 días', value: 7 },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
  { label: '1 año', value: 365 },
]

watch(() => props.data?.meta?.days, (days) => {
  if (days && days !== range.value) range.value = days
})

watch(range, (value) => {
  const days = Number(value)
  if (Number.isFinite(days) && days > 0 && days !== props.data?.meta?.days) {
    emit('range-change', days)
  }
})

const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(value || 0)

const formatDateOnly = (value: string) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

// ── Documentos ─────────────────────────────────────────────
const chartData = computed(() => {
  if (!props.data) return { categories: [], series: [] }

  const categories = [
    { label: 'Presupuestos', value: props.data.quotes.total, color: '#3b82f6' },
    { label: 'Órdenes', value: props.data.orders.total, color: '#f59e0b' },
    { label: 'Facturas', value: props.data.invoices.total, color: '#10b981' },
    { label: 'Notas crédito', value: props.data.creditNotes.total, color: '#8b5cf6' },
    { label: 'Notas débito', value: props.data.debitNotes.total, color: '#ec4899' },
    { label: 'Remitos', value: props.data.remitos.total, color: '#06b6d4' },
  ]

  const canSeeDocuments = isOwnerOrAdmin.value || hasPermission('documents.read')
  const filtered = canSeeDocuments ? categories : []

  return {
    categories: filtered.map((c) => c.label),
    series: [
      {
        name: 'Cantidad',
        data: filtered.map((c) => ({ value: c.value, itemStyle: { color: c.color } })),
      },
    ],
  }
})

const totalActivity = computed(() => chartData.value.series[0]?.data.reduce((sum, item) => sum + Number(item.value), 0) ?? 0)

const documentMix = computed(() => {
  if (!props.data) return []
  return [
    { name: 'Presupuestos', value: props.data.quotes.total, itemStyle: { color: '#3b82f6' } },
    { name: 'Órdenes', value: props.data.orders.total, itemStyle: { color: '#f59e0b' } },
    { name: 'Facturas', value: props.data.invoices.total, itemStyle: { color: '#10b981' } },
    { name: 'Remitos', value: props.data.remitos.total, itemStyle: { color: '#06b6d4' } },
  ].filter(item => item.value > 0)
})

// ── Productos ──────────────────────────────────────────────
const canSeeProducts = computed(() => isOwnerOrAdmin.value || hasPermission('products.read'))

const productStats = computed(() => {
  const products = props.data?.products
  if (!products) return []
  return [
    { label: 'Productos', value: formatNumber(products.total), icon: 'i-lucide-package', iconClass: 'bg-primary/10 text-primary' },
    { label: 'En depósito', value: formatNumber(products.withStock), detail: `${formatNumber(products.withStockUnits)} unidades`, icon: 'i-lucide-warehouse', iconClass: 'bg-info/10 text-info' },
    { label: 'Para venta', value: formatNumber(products.forSale), icon: 'i-lucide-tag', iconClass: 'bg-success/10 text-success' },
    { label: 'Para compra', value: formatNumber(products.forPurchase), icon: 'i-lucide-shopping-bag', iconClass: 'bg-warning/10 text-warning' },
    { label: 'Costeados', value: formatNumber(products.costed), icon: 'i-lucide-circle-check', iconClass: 'bg-success/10 text-success' },
    { label: 'Sin costear', value: formatNumber(products.uncosted), icon: 'i-lucide-circle-alert', iconClass: 'bg-error/10 text-error' },
  ]
})

const showDocuments = computed(() => chartData.value.categories.length > 0)
const showProducts = computed(() => canSeeProducts.value && productStats.value.length > 0)

// ── Click en el gráfico → listado correspondiente ────────────────────────────
const documentRoutes: Record<string, string> = {
  'Presupuestos': '/erp/budgets',
  'Órdenes': '/erp/orders',
  'Facturas': '/erp/sales?category=INVOICE',
  'Notas crédito': '/erp/sales?category=CREDIT_NOTE',
  'Notas débito': '/erp/sales?category=DEBIT_NOTE',
  'Remitos': '/erp/remitos',
}

const chartsHost = ref<HTMLElement | null>(null)

const setChartCursor = (cursor: string) => {
  chartsHost.value?.querySelectorAll('canvas').forEach((canvas) => {
    ;(canvas as HTMLCanvasElement).style.cursor = cursor
  })
}

const handleChartClick = (params: any) => {
  const to = documentRoutes[String(params?.name ?? '')]
  if (to) navigateTo(to)
}

const handleChartOver = (params: any) => {
  if (params?.componentType === 'series' && documentRoutes[String(params?.name ?? '')]) {
    setChartCursor('pointer')
  }
}

const handleChartOut = () => setChartCursor('')

const barTooltipFormatter = (params: any) => {
  const p = Array.isArray(params) ? params[0] : params
  if (!p) return ''
  return `${p.name}: <b>${p.value}</b><br/><span style='opacity:.7'>Clic para abrir</span>`
}
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="grid size-9 place-items-center rounded-xl bg-info/10 text-info">
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-5" />
        </div>
        <div>
          <h3 class="text-sm font-semibold">Actividad de la empresa</h3>
          <p class="text-xs text-muted">
            Documentos del período · productos actuales
            <template v-if="data?.meta">
              · <span class="font-medium text-default">Desde {{ formatDateOnly(data.meta.documents_from) }}</span>
            </template>
          </p>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <UBadge v-if="data && showDocuments" :label="`${totalActivity} documentos`" color="info" variant="soft" />
          <USelect
            v-model="range"
            :items="rangeOptions"
            value-key="value"
            size="xs"
            class="w-24"
            aria-label="Período del gráfico"
          />
        </div>
      </div>
    </template>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-64 w-full rounded-lg" />
      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <USkeleton v-for="i in 6" :key="i" class="h-20 rounded-xl" />
      </div>
    </div>

    <div v-else-if="!showDocuments && !showProducts" class="h-64 flex items-center justify-center text-muted text-sm">
      Sin datos disponibles
    </div>

    <div v-else ref="chartsHost" class="space-y-5">
      <!-- DOCUMENTOS -->
      <div v-if="showDocuments" class="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.85fr)]">
        <div class="min-w-0 rounded-xl border border-default bg-muted/10 p-3">
          <div class="mb-1 flex items-center justify-between px-1">
            <p class="text-xs font-medium text-muted">Documentos por tipo</p>
            <UIcon name="i-lucide-chart-bar-big" class="size-4 text-muted" />
          </div>
          <div class="h-72">
            <VChart :option="{
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: barTooltipFormatter,
              },
              xAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, .15)' } },
                axisLabel: { fontSize: 10 },
              },
              yAxis: {
                type: 'category',
                data: chartData.categories,
                axisLabel: { fontSize: 11, width: 90, overflow: 'truncate' },
                axisTick: { show: false },
              },
              series: chartData.series.map(s => ({
                ...s,
                type: 'bar',
                barMaxWidth: 18,
                showBackground: true,
                backgroundStyle: { color: 'rgba(148, 163, 184, .08)', borderRadius: 8 },
                label: { show: true, position: 'right', fontWeight: 600 },
                itemStyle: { borderRadius: [0, 8, 8, 0] },
              })),
              grid: { left: 105, right: 40, top: 8, bottom: 15 },
            }" autoresize class="size-full" @click="handleChartClick" @mouseover="handleChartOver" @mouseout="handleChartOut" />
          </div>
        </div>

        <div class="rounded-xl border border-default bg-muted/10 p-3">
          <p class="px-1 text-xs font-medium text-muted">Distribución comercial</p>
          <div v-if="documentMix.length" class="h-52">
            <VChart :option="{
              tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)\nClic para abrir' },
              series: [{
                type: 'pie',
                radius: ['55%', '78%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 6, borderWidth: 3, borderColor: 'transparent' },
                label: { show: false },
                data: documentMix,
              }],
            }" autoresize class="size-full" @click="handleChartClick" @mouseover="handleChartOver" @mouseout="handleChartOut" />
          </div>
          <div v-else class="flex h-52 items-center justify-center text-xs text-muted">Sin documentos</div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="item in documentMix"
              :key="item.name"
              type="button"
              class="flex items-center gap-2 rounded-lg bg-default px-2 py-1.5 text-left transition hover:bg-elevated"
              :class="documentRoutes[item.name] ? 'cursor-pointer' : 'cursor-default'"
              @click="documentRoutes[item.name] && navigateTo(documentRoutes[item.name])"
            >
              <span class="size-2 rounded-full" :style="{ backgroundColor: item.itemStyle.color }" />
              <span class="min-w-0 flex-1 truncate text-[11px] text-muted">{{ item.name }}</span>
              <span class="text-xs font-semibold">{{ item.value }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PRODUCTOS -->
      <div v-if="showProducts" class="rounded-xl border border-default bg-muted/10 p-3">
        <div class="mb-3 flex items-center justify-between px-1">
          <p class="text-xs font-medium text-muted">Productos (snapshot actual)</p>
          <UIcon name="i-lucide-boxes" class="size-4 text-muted" />
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div v-for="stat in productStats" :key="stat.label" class="rounded-xl bg-default p-3">
            <div class="flex items-center gap-2">
              <div class="grid size-8 place-items-center rounded-lg" :class="stat.iconClass">
                <UIcon :name="stat.icon" class="size-4" />
              </div>
              <p class="min-w-0 truncate text-xs text-muted">{{ stat.label }}</p>
            </div>
            <p class="mt-2 text-xl font-bold tabular-nums">{{ stat.value }}</p>
            <p v-if="stat.detail" class="mt-0.5 text-[11px] text-muted">{{ stat.detail }}</p>
          </div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
