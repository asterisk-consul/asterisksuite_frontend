<script setup lang="ts">
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'

const props = defineProps<{
  entries: any[]
  balance: number
  currencyCode?: string
}>()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.currencyCode || 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

// Gráfico de evolución del saldo (line chart)
const balanceChartData = computed(() => {
  const sorted = [...props.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${p.axisValue}<br/>Saldo: ${formatCurrency(p.value)}`
      }
    },
    grid: { left: 60, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: sorted.map((e) => e.date?.split('T')[0] ?? ''),
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => formatCurrency(v) }
    },
    series: [
      {
        type: 'line',
        data: sorted.map((e) => Number(e.balance_after)),
        smooth: true,
        lineStyle: { width: 2, color: props.balance >= 0 ? '#22c55e' : '#ef4444' },
        areaStyle: { color: props.balance >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
        itemStyle: { color: props.balance >= 0 ? '#22c55e' : '#ef4444' }
      }
    ]
  }
})

// Resumen por tipo de entrada
const entryTypeSummary = computed(() => {
  const map = new Map<string, { count: number; total: number; side: string }>()
  for (const e of props.entries) {
    const config = ENTRY_TYPE_CONFIG[e.type]
    const label = config?.label ?? e.type
    const side = config?.side ?? 'debit'
    const existing = map.get(label) || { count: 0, total: 0, side }
    existing.count++
    existing.total += Number(e.amount) || 0
    map.set(label, existing)
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

// Gráfico de torta por tipo de entrada
const entryTypePieData = computed(() => {
  const colors = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']
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
        data: entryTypeSummary.value.map((item, i) => ({
          value: item.total,
          name: item.name,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }
    ]
  }
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Gráfico de evolución -->
    <UCard>
      <template #header>
        <p class="text-sm font-medium">Evolución del saldo</p>
      </template>
      <div v-if="entries.length === 0" class="text-center py-8 text-muted text-sm">
        Sin datos para graficar
      </div>
      <div v-else class="h-64">
        <ClientOnly>
          <VChart :option="balanceChartData" autoresize />
        </ClientOnly>
      </div>
    </UCard>

    <!-- Resumen por tipo -->
    <UCard>
      <template #header>
        <p class="text-sm font-medium">Movimientos por tipo</p>
      </template>
      <div v-if="entryTypeSummary.length === 0" class="text-center py-8 text-muted text-sm">
        Sin movimientos
      </div>
      <div v-else class="space-y-3">
        <div class="h-48">
          <ClientOnly>
            <VChart :option="entryTypePieData" autoresize />
          </ClientOnly>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in entryTypeSummary"
            :key="item.name"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-muted">{{ item.name }}</span>
            <span class="font-medium">{{ formatCurrency(item.total) }}</span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
