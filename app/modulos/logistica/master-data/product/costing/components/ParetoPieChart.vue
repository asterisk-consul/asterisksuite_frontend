<script setup lang="ts">
import type { ParetoItem } from '../types/costing.types'

const props = defineProps<{
  items: ParetoItem[]
  totalCost: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
  mode?: 'materials' | 'assemblies' | 'full' // ← nuevo
}>()

const PALETTE = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
  '#48b8d0',
  '#f9a8d4',
  '#a3e635'
]

const isSingle = computed(() => props.items.length === 1)

// Mostrar anillo vital/trivial solo cuando tiene sentido
const showVitalRing = computed(() => !isSingle.value && props.mode !== 'assemblies')

const option = computed(() => {
  const outerData = props.items.map((i, idx) => ({
    name: i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name,
    value: i.total_cost,
    itemStyle: { color: PALETTE[idx % PALETTE.length] }
  }))

  const vitalCost = props.items.filter((i) => i.is_vital).reduce((s, i) => s + i.total_cost, 0)
  const trivialCost = props.totalCost - vitalCost

  const innerData = [
    { name: 'Vital (80%)', value: vitalCost, itemStyle: { color: '#5470c6' } },
    { name: 'Trivial (20%)', value: trivialCost, itemStyle: { color: '#91cc75' } }
  ].filter((d) => d.value > 0)

  const series: any[] = []

  if (showVitalRing.value && innerData.length > 1) {
    series.push({
      name: 'Clasificación',
      type: 'pie',
      radius: ['20%', '40%'],
      center: ['50%', '45%'],
      label: { show: true, fontSize: 11, formatter: '{b}: {d}%' },
      data: innerData,
      tooltip: {
        formatter: (p: any) =>
          `${p.name}<br/>` +
          `Costo: <b>${props.formatCurrency(p.value)}</b><br/>` +
          `Participación: <b>${props.formatPercentage(p.percent)}</b>`
      }
    })
  }

  series.push({
    name: props.mode === 'assemblies' ? 'Conjuntos' : 'Componentes',
    type: 'pie',
    radius: isSingle.value || !showVitalRing.value ? ['35%', '65%'] : ['45%', '68%'],
    center: ['50%', '45%'],
    label: {
      show: isSingle.value,
      fontSize: 12,
      formatter: '{b}: {d}%'
    },
    emphasis: {
      label: { show: true, fontSize: 12, fontWeight: 'bold' }
    },
    data: outerData
  })

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) =>
        `${p.name}<br/>` +
        `Costo: <b>${props.formatCurrency(p.value)}</b><br/>` +
        `Participación: <b>${props.formatPercentage(p.percent)}</b>`
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      type: 'scroll',
      textStyle: { fontSize: 11 },
      formatter: (name: string) => (name.length > 20 ? name.slice(0, 20) + '…' : name)
    },
    series
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height: '320px', width: '100%' }" autoresize />
</template>
