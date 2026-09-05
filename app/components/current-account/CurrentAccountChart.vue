<script setup lang="ts">
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import { resolveSide } from '~/modulos/erp/current-accounts/utils'
import { isReceivable, balanceChartColor, balanceChartAreaColor, entryChartColor } from '~/modulos/erp/current-accounts/balance-utils'

const props = defineProps<{
  entries: any[]
  balance: number
  partyType?: string
}>()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

// Gráfico de evolución del saldo (line chart)
const balanceChartData = computed(() => {
  const sorted = [...props.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const color = balanceChartColor(props.balance, props.partyType)
  const areaColor = balanceChartAreaColor(props.balance, props.partyType)

  // Agregar punto inicial en 0 antes de la primera entrada
  const dates: string[] = ['Inicio']
  const values: number[] = [0]
  for (const e of sorted) {
    dates.push(e.date?.split('T')[0] ?? '')
    values.push(Number(e.balance_after))
  }

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
      data: dates,
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => formatCurrency(v) }
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2, color },
        areaStyle: { color: areaColor },
        itemStyle: { color }
      }
    ]
  }
})

// Resumen por tipo de entrada
const entryTypeSummary = computed(() => {
  const map = new Map<string, { count: number; total: number; type: string }>()
  for (const e of props.entries) {
    const config = ENTRY_TYPE_CONFIG[e.type]
    const label = config?.label ?? e.type
    const existing = map.get(label) || { count: 0, total: 0, type: e.type }
    existing.count++
    existing.total += Number(e.converted_amount ?? e.amount) || 0
    map.set(label, existing)
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

// Gráfico de torta por tipo de entrada
const entryTypePieData = computed(() => {
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
        data: entryTypeSummary.value.map((item) => ({
          value: item.total,
          name: item.name,
          itemStyle: { color: entryChartColor(item.type, props.partyType) }
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
