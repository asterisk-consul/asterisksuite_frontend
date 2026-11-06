<script setup lang="ts">
import type { CurrencyRate } from '~/modulos/erp/currency-rates/types/currency-rates.types'

const props = defineProps<{
  rates: CurrencyRate[]
}>()

const chartData = computed(() => {
  return [...props.rates]
    .sort((a, b) => {
      return (
        new Date(a.effective_date ?? '').getTime() -
        new Date(b.effective_date ?? '').getTime()
      )
    })
    .map((item) => ({
      date: new Date(item.effective_date ?? '').toLocaleDateString('es-AR'),
      rate: Number(item.rate)
    }))
})

const formatRate = (value: number) => new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
}).format(value)

const chartOption = computed(() => ({
  animation: false,
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: number) => formatRate(Number(value))
  },
  grid: { left: 12, right: 20, top: 20, bottom: 32, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: chartData.value.map(item => item.date) },
  yAxis: { type: 'value', scale: true },
  series: [{
    name: 'Cotización',
    type: 'line',
    smooth: true,
    showSymbol: false,
    data: chartData.value.map(item => item.rate),
    lineStyle: { width: 2 },
    areaStyle: { opacity: 0.08 }
  }]
}))
</script>

<template>
  <UPageCard
    title="Histórico"
    description="Evolución de cotizaciones"
    variant="subtle"
  >
    <div class="h-[350px] w-full">
      <VChart :option="chartOption" autoresize class="size-full" />
    </div>
  </UPageCard>
</template>
