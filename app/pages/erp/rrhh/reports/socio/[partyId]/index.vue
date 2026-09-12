<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { HR_VALE_TYPE_LABELS, HR_VALE_TYPE_COLORS } from '~/modulos/erp/hr/types/hr.types'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const hrStore = useHrStore()

const partyId = route.params.partyId as string

const report = ref<any>(null)
const loading = ref(true)

// Filtros
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterType = ref<string | undefined>(undefined)
const selectedCurrency = ref<'ARS' | 'USD'>('ARS')
const currencySummary = computed(() => report.value?.summary?.by_currency?.[selectedCurrency.value] ?? {
  total_aportes: 0,
  total_retiros: 0,
  total_reembolsos: 0,
  total_prestamos: 0,
  saldo_neto: 0
})

const filterTypeOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Aporte', value: 'APORTE' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Préstamo', value: 'PRESTAMO' },
]

const filteredVales = computed(() => {
  if (!report.value?.vales) return []
  let list = [...report.value.vales]
  if (filterType.value) list = list.filter(v => v.type === filterType.value)
  if (filterDateFrom.value) list = list.filter(v => v.date >= filterDateFrom.value)
  if (filterDateTo.value) list = list.filter(v => v.date <= filterDateTo.value)
  return list
})

onMounted(async () => {
  try {
    report.value = await hrStore.fetchPartnerReport(partyId)
  } catch (e: any) {
    toast.add({ title: 'Error al cargar reporte', color: 'error' })
    router.push('/erp/rrhh/partners')
  } finally {
    loading.value = false
  }
})

const goBack = () => router.push('/erp/rrhh/partners')

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const fmtCurrency = (n: number, code: string = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(n ?? 0)

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('es-AR') : '-'

const movementAmount = (vale: any, currency: 'ARS' | 'USD') => {
  const amount = Number(vale.amount) || 0
  const rate = Number(vale.exchange_rate) || 0
  if (vale.currency_code === currency) return amount
  if (!rate) return null
  return currency === 'ARS' ? amount * rate : amount / rate
}

// ═══════════════════════════════════════════
// GRÁFICO: EVOLUCIÓN DEL SALDO (line chart)
// ═══════════════════════════════════════════

const balanceChartData = computed(() => {
  const evo = report.value?.evolution ?? []
  if (evo.length === 0) return null

  const dates = evo.map(e => e.date)
  const values = evo.map(e => selectedCurrency.value === 'ARS' ? e.balance_ars : e.balance_usd)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let text = `${params[0].axisValue}<br/>`
        for (const p of params) text += `${p.marker} ${p.seriesName}: ${fmtCurrency(p.value, selectedCurrency.value)}<br/>`
        return text
      }
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 80, right: 20, top: 10, bottom: 40 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => fmtCurrency(v, selectedCurrency.value) }
    },
    series: [
      {
        name: selectedCurrency.value,
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2, color: '#22c55e' },
        areaStyle: { color: 'rgba(34,197,94,0.1)' },
        itemStyle: { color: '#22c55e' }
      }
    ]
  }
})

// ═══════════════════════════════════════════
// GRÁFICO: APORTE vs RETIRO (barras apiladas)
// ═══════════════════════════════════════════

const aportesVsRetirosData = computed(() => {
  const vales = (report.value?.vales ?? []).filter(v => ['CONFIRMED', 'PAID'].includes(v.status))
  if (vales.length === 0) return null

  const monthlyMap = new Map<string, { aportes: number; retiros: number }>()
  for (const v of vales) {
    const month = v.date?.substring(0, 7) ?? 'unknown'
    const existing = monthlyMap.get(month) ?? { aportes: 0, retiros: 0 }
    const amount = movementAmount(v, selectedCurrency.value) ?? 0
    if (v.type === 'APORTE') existing.aportes += amount
    if (['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(v.type)) existing.retiros += amount
    monthlyMap.set(month, existing)
  }

  const months = Array.from(monthlyMap.keys()).sort()
  const aportes = months.map(m => monthlyMap.get(m)?.aportes ?? 0)
  const retiros = months.map(m => monthlyMap.get(m)?.retiros ?? 0)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let text = `${params[0].axisValue}<br/>`
        for (const p of params) {
          text += `${p.marker} ${p.seriesName}: ${fmtCurrency(p.value, selectedCurrency.value)}<br/>`
        }
        return text
      }
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 80, right: 20, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => fmtCurrency(v, selectedCurrency.value) } },
    series: [
      {
        name: 'Aportes',
        type: 'bar',
        stack: 'total',
        data: aportes,
        itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: 'Retiros',
        type: 'bar',
        stack: 'total',
        data: retiros.map(v => -v),
        itemStyle: { color: '#ef4444', borderRadius: [0, 0, 4, 4] }
      }
    ]
  }
})

// ═══════════════════════════════════════════
// GRÁFICO: COMPOSICIÓN (pie chart)
// ═══════════════════════════════════════════

const compositionData = computed(() => {
  const summary = currencySummary.value
  if (!summary) return null

  const items = [
    { value: summary.total_aportes, name: 'Aportes', itemStyle: { color: '#22c55e' } },
    { value: summary.total_retiros, name: 'Retiros', itemStyle: { color: '#ef4444' } },
    { value: summary.total_reembolsos, name: 'Reembolsos', itemStyle: { color: '#f59e0b' } },
    { value: summary.total_prestamos, name: 'Préstamos', itemStyle: { color: '#3b82f6' } },
  ].filter(i => i.value > 0)

  if (items.length === 0) return null

  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${fmtCurrency(p.value, selectedCurrency.value)} (${p.percent}%)` },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        padAngle: 2,
        itemStyle: { borderRadius: 6 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
        data: items
      }
    ]
  }
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      :title="`Reporte de Socio — ${report?.partner?.name ?? '...'}`"
      :description="`DNI: ${report?.partner?.document_number ?? '-'} · Participación: ${report?.partner?.share_percentage ?? 0}%`"
    >
      <template #links>
        <UButton label="Volver" icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
      </template>
    </AppPageHeader>

    <div class="flex justify-end">
      <UFieldGroup>
        <UButton label="Pesos (ARS)" :variant="selectedCurrency === 'ARS' ? 'solid' : 'outline'" @click="selectedCurrency = 'ARS'" />
        <UButton label="Dólares (USD)" :variant="selectedCurrency === 'USD' ? 'solid' : 'outline'" @click="selectedCurrency = 'USD'" />
      </UFieldGroup>
    </div>

    <!-- KPI CARDS -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total Aportes</p>
          <p class="text-lg font-bold text-success">{{ fmtCurrency(currencySummary.total_aportes, selectedCurrency) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total Retiros</p>
          <p class="text-lg font-bold text-error">{{ fmtCurrency(currencySummary.total_retiros, selectedCurrency) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Reembolsos</p>
          <p class="text-lg font-bold text-warning">{{ fmtCurrency(currencySummary.total_reembolsos, selectedCurrency) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo {{ selectedCurrency }}</p>
          <p class="text-lg font-bold" :class="currencySummary.saldo_neto >= 0 ? 'text-success' : 'text-error'">
            {{ fmtCurrency(currencySummary.saldo_neto, selectedCurrency) }}
          </p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Préstamos</p>
          <p class="text-lg font-bold text-info">
            {{ fmtCurrency(currencySummary.total_prestamos, selectedCurrency) }}
          </p>
        </div>
      </UPageCard>
    </div>

    <!-- GRÁFICOS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Evolución del saldo -->
      <UCard>
        <template #header>
          <p class="text-sm font-medium">Evolución del saldo</p>
        </template>
        <div v-if="!balanceChartData" class="text-center py-8 text-muted text-sm">
          Sin datos para graficar
        </div>
        <div v-else class="h-64">
          <ClientOnly>
            <VChart :option="balanceChartData" autoresize />
          </ClientOnly>
        </div>
      </UCard>

      <!-- Aportes vs Retiros -->
      <UCard>
        <template #header>
          <p class="text-sm font-medium">Aportes vs Retiros</p>
        </template>
        <div v-if="!aportesVsRetirosData" class="text-center py-8 text-muted text-sm">
          Sin datos para graficar
        </div>
        <div v-else class="h-64">
          <ClientOnly>
            <VChart :option="aportesVsRetirosData" autoresize />
          </ClientOnly>
        </div>
      </UCard>
    </div>

    <!-- Composición -->
    <UCard v-if="compositionData">
      <template #header>
        <p class="text-sm font-medium">Composición de movimientos</p>
      </template>
      <div class="h-48 max-w-md mx-auto">
        <ClientOnly>
          <VChart :option="compositionData" autoresize />
        </ClientOnly>
      </div>
    </UCard>

    <!-- FILTROS + TABLA -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">Detalle de vales</p>
          <div class="flex gap-2">
            <UInput v-model="filterDateFrom" type="date" placeholder="Desde" class="w-40" />
            <UInput v-model="filterDateTo" type="date" placeholder="Hasta" class="w-40" />
            <USelect v-model="filterType" :items="filterTypeOptions" placeholder="Tipo" class="w-40" />
          </div>
        </div>
      </template>

      <UTable
        :data="filteredVales"
        :columns="[
          { id: 'number', header: 'Nº' },
          { id: 'type', header: 'Tipo' },
          { id: 'amount', header: 'Monto original' },
          { id: 'ars', header: 'Pesos (ARS)' },
          { id: 'usd', header: 'Dólares (USD)' },
          { id: 'date', header: 'Fecha' },
          { id: 'status', header: 'Estado' }
        ]"
      >
        <template #number-cell="{ row }">
          <span class="font-mono font-medium">#{{ row.original.number }}</span>
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="HR_VALE_TYPE_LABELS[row.original.type as keyof typeof HR_VALE_TYPE_LABELS] ?? row.original.type"
            :color="HR_VALE_TYPE_COLORS[row.original.type as keyof typeof HR_VALE_TYPE_COLORS] as any ?? 'neutral'"
            variant="subtle"
          />
        </template>

        <template #amount-cell="{ row }">
          <span class="font-medium">{{ fmtCurrency(Number(row.original.amount), row.original.currency_code) }}</span>
        </template>

        <template #ars-cell="{ row }">
          <span v-if="movementAmount(row.original, 'ARS') != null" class="font-medium">
            {{ fmtCurrency(movementAmount(row.original, 'ARS') ?? 0, 'ARS') }}
          </span>
          <span v-else class="text-xs text-warning">Sin cotización</span>
        </template>

        <template #usd-cell="{ row }">
          <div v-if="movementAmount(row.original, 'USD') != null">
            <span class="font-medium">{{ fmtCurrency(movementAmount(row.original, 'USD') ?? 0, 'USD') }}</span>
            <p v-if="row.original.exchange_rate" class="text-xs text-muted">TC {{ Number(row.original.exchange_rate).toLocaleString('es-AR') }}</p>
          </div>
          <span v-else class="text-xs text-warning">Sin cotización</span>
        </template>

        <template #date-cell="{ row }">
          {{ fmtDate(row.original.date) }}
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.status"
            :color="row.original.status === 'CONFIRMED' ? 'success' : row.original.status === 'DRAFT' ? 'neutral' : 'error'"
            variant="subtle"
          />
        </template>
      </UTable>
    </UCard>
  </UPage>
</template>
