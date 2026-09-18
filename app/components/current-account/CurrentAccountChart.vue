<script setup lang="ts">
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import { resolveEntrySide } from '~/modulos/erp/current-accounts/utils'
import { balanceChartColor, balanceChartAreaColor, entryChartColor } from '~/modulos/erp/current-accounts/balance-utils'

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

const replacementByDocument = computed(() => {
  const map = new Map<string, number>()
  for (const entry of props.entries) {
    if (!entry.reference_id) continue
    const amount = Number(entry.converted_amount ?? entry.amount) || 0
    if (entry.type === 'ORDER_INVOICE_REPLACEMENT') {
      map.set(entry.reference_id, (map.get(entry.reference_id) ?? 0) + amount)
    } else if (entry.type === 'ORDER_INVOICE_REPLACEMENT_REVERSAL') {
      map.set(entry.reference_id, Math.max(0, (map.get(entry.reference_id) ?? 0) - amount))
    }
  }
  return map
})

const activeReplacementAmount = computed(() =>
  Array.from(replacementByDocument.value.values()).reduce((sum, amount) => sum + amount, 0)
)

// Gráfico de evolución del saldo (line chart)
const balanceChartData = computed(() => {
  const sorted = [...props.entries]
    .filter(e => !['ORDER_INVOICE_REPLACEMENT', 'ORDER_INVOICE_REPLACEMENT_REVERSAL'].includes(e.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const color = balanceChartColor(props.balance, props.partyType)
  const areaColor = balanceChartAreaColor(props.balance, props.partyType)

  // Agregar punto inicial en 0 antes de la primera entrada
  const dates: string[] = ['Inicio']
  const values: number[] = [0]
  let runningBalance = 0
  for (const e of sorted) {
    const amount = Number(e.converted_amount ?? e.amount) || 0
    const replacement = e.type === 'INVOICE' && e.reference_id
      ? replacementByDocument.value.get(e.reference_id) ?? 0
      : 0
    const visibleAmount = Math.max(0, amount - replacement)
    runningBalance += resolveEntrySide(e, props.partyType) === 'debit' ? visibleAmount : -visibleAmount
    dates.push(e.date?.split('T')[0] ?? '')
    values.push(runningBalance)
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
    if (['ORDER_INVOICE_REPLACEMENT', 'ORDER_INVOICE_REPLACEMENT_REVERSAL'].includes(e.type)) continue
    const config = ENTRY_TYPE_CONFIG[e.type]
    const label = config?.label ?? e.type
    const existing = map.get(label) || { count: 0, total: 0, type: e.type }
    existing.count++
    existing.total += Number(e.converted_amount ?? e.amount) || 0
    map.set(label, existing)
  }
  const invoice = map.get(ENTRY_TYPE_CONFIG.INVOICE.label)
  if (invoice) invoice.total = Math.max(0, invoice.total - activeReplacementAmount.value)
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
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
    <!-- Gráfico de evolución -->
    <UPageCard variant="subtle" class="overflow-hidden">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-chart-no-axes-combined" class="size-4" />
          </div>
          <div>
            <p class="font-semibold">Evolución del saldo</p>
            <p class="text-xs text-muted">Cambios acumulados en la cuenta</p>
          </div>
        </div>
      </template>
      <div v-if="entries.length === 0" class="text-center py-8 text-muted text-sm">
        Sin datos para graficar
      </div>
      <div v-else class="h-72">
        <ClientOnly>
          <VChart :option="balanceChartData" autoresize />
        </ClientOnly>
      </div>
    </UPageCard>

    <!-- Resumen por tipo -->
    <UPageCard variant="subtle" class="overflow-hidden">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-xl bg-neutral/10 text-muted">
            <UIcon name="i-lucide-chart-pie" class="size-4" />
          </div>
          <div>
            <p class="font-semibold">Movimientos por tipo</p>
            <p class="text-xs text-muted">Composición de la cuenta</p>
          </div>
        </div>
      </template>
      <div v-if="entryTypeSummary.length === 0" class="text-center py-8 text-muted text-sm">
        Sin movimientos
      </div>
      <div v-else class="space-y-3">
        <div class="h-44">
          <ClientOnly>
            <VChart :option="entryTypePieData" autoresize />
          </ClientOnly>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in entryTypeSummary"
            :key="item.name"
            class="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-elevated/50"
          >
            <span class="text-muted">{{ item.name }}</span>
            <span class="font-medium">{{ formatCurrency(item.total) }}</span>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
