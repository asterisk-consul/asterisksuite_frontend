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

// ═══════════════════════════════════════════
// GRÁFICO: EVOLUCIÓN DEL SALDO (line chart)
// ═══════════════════════════════════════════

const balanceChartData = computed(() => {
  const evo = report.value?.evolution ?? []
  if (evo.length === 0) return null

  const dates = evo.map(e => e.date)
  const arsValues = evo.map(e => e.balance_ars)
  const usdValues = evo.map(e => e.balance_usd)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let text = `${params[0].axisValue}<br/>`
        for (const p of params) {
          const currency = p.seriesName === 'ARS' ? 'ARS' : 'USD'
          text += `${p.marker} ${p.seriesName}: ${fmtCurrency(p.value, currency)}<br/>`
        }
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
      axisLabel: { fontSize: 10, formatter: (v: number) => fmtCurrency(v, 'ARS') }
    },
    series: [
      {
        name: 'ARS',
        type: 'line',
        data: arsValues,
        smooth: true,
        lineStyle: { width: 2, color: '#22c55e' },
        areaStyle: { color: 'rgba(34,197,94,0.1)' },
        itemStyle: { color: '#22c55e' }
      },
      {
        name: 'USD',
        type: 'line',
        data: usdValues,
        smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: { color: 'rgba(59,130,246,0.1)' },
        itemStyle: { color: '#3b82f6' }
      }
    ]
  }
})

// ═══════════════════════════════════════════
// GRÁFICO: APORTE vs RETIRO (barras apiladas)
// ═══════════════════════════════════════════

const aportesVsRetirosData = computed(() => {
  const vales = report.value?.vales ?? []
  if (vales.length === 0) return null

  const monthlyMap = new Map<string, { aportes: number; retiros: number }>()
  for (const v of vales) {
    const month = v.date?.substring(0, 7) ?? 'unknown'
    const existing = monthlyMap.get(month) ?? { aportes: 0, retiros: 0 }
    const amount = Number(v.amount) || 0
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
          text += `${p.marker} ${p.seriesName}: ${fmtCurrency(p.value)}<br/>`
        }
        return text
      }
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 80, right: 20, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => fmtCurrency(v) } },
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
  const summary = report.value?.summary
  if (!summary) return null

  const items = [
    { value: summary.total_aportes, name: 'Aportes', itemStyle: { color: '#22c55e' } },
    { value: summary.total_retiros, name: 'Retiros', itemStyle: { color: '#ef4444' } },
    { value: summary.total_reembolsos, name: 'Reembolsos', itemStyle: { color: '#f59e0b' } },
    { value: summary.total_prestamos, name: 'Préstamos', itemStyle: { color: '#3b82f6' } },
  ].filter(i => i.value > 0)

  if (items.length === 0) return null

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
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

    <!-- KPI CARDS -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total Aportes</p>
          <p class="text-lg font-bold text-success">{{ fmtCurrency(report?.summary?.total_aportes ?? 0) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total Retiros</p>
          <p class="text-lg font-bold text-error">{{ fmtCurrency(report?.summary?.total_retiros ?? 0) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Reembolsos</p>
          <p class="text-lg font-bold text-warning">{{ fmtCurrency(report?.summary?.total_reembolsos ?? 0) }}</p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo ARS</p>
          <p class="text-lg font-bold" :class="(report?.summary?.saldo_neto_ars ?? 0) >= 0 ? 'text-success' : 'text-error'">
            {{ fmtCurrency(report?.summary?.saldo_neto_ars ?? 0, 'ARS') }}
          </p>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo USD</p>
          <p class="text-lg font-bold" :class="(report?.summary?.saldo_neto_usd ?? 0) >= 0 ? 'text-success' : 'text-error'">
            {{ fmtCurrency(report?.summary?.saldo_neto_usd ?? 0, 'USD') }}
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
          { id: 'amount', header: 'Monto' },
          { id: 'converted', header: 'Equivalente' },
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

        <template #converted-cell="{ row }">
          <span v-if="row.original.converted_amount" class="text-sm text-muted">
            {{ fmtCurrency(Number(row.original.converted_amount), row.original.currency_code === 'USD' ? 'ARS' : 'USD') }}
          </span>
          <span v-else-if="row.original.exchange_rate" class="text-sm text-muted">
            TC: {{ row.original.exchange_rate }}
          </span>
          <span v-else class="text-xs text-muted">-</span>
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
