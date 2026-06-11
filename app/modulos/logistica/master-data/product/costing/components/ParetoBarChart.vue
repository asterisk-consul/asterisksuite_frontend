<script setup lang="ts">
import type { ParetoItem } from '../types/costing.types'

const props = defineProps<{
  items: ParetoItem[]
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}>()

const option = computed(() => {
  const sorted = [...props.items].sort((a, b) => b.total_cost - a.total_cost)
  const names = sorted.map((i) => (i.variant_name ? `${i.product_name}\n${i.variant_name}` : i.product_name))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        const bar = params.find((p) => p.seriesType === 'bar')
        const line = params.find((p) => p.seriesType === 'line')
        const index = bar?.dataIndex ?? line?.dataIndex ?? 0
        const item = sorted[index]

        if (!item) return '' // ← guard

        return [
          `<b>${item.product_name}</b>`,
          item.variant_name ? `<span style="color:#aaa">${item.variant_name}</span>` : '',
          `Costo: <b>${props.formatCurrency(item.total_cost)}</b>`,
          `Participación: <b>${props.formatPercentage(item.percentage)}</b>`,
          line ? `Acumulado: <b>${props.formatPercentage(item.cumulative)}</b>` : ''
        ]
          .filter(Boolean)
          .join('<br/>')
      }
    },
    legend: {
      data: ['Costo', '% Acumulado'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '40px',
      top: '10px',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: names,
        axisLabel: {
          interval: 0,
          rotate: names.length > 5 ? 30 : 0,
          fontSize: 11,
          overflow: 'truncate',
          width: 80
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Costo',
        nameTextStyle: { fontSize: 10 },
        axisLabel: {
          formatter: (v: number) => props.formatCurrency(v)
        }
      },
      {
        type: 'value',
        name: '% Acum.',
        min: 0,
        max: 100,
        nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: (v: number) => `${v}%` }
      }
    ],
    series: [
      {
        name: 'Costo',
        type: 'bar',
        data: sorted.map((i) => ({
          value: i.total_cost,
          itemStyle: {
            color: i.is_vital ? '#5470c6' : '#94a3b8' // azul para vital, gris para trivial
          }
        })),
        barMaxWidth: 48
      },
      {
        name: '% Acumulado',
        type: 'line',
        yAxisIndex: 1,
        data: sorted.map((i) => i.cumulative),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#fac858', width: 2 },
        itemStyle: { color: '#fac858' },
        markLine: {
          silent: true,
          lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
          data: [{ yAxis: 80 }],
          label: { formatter: '80%', position: 'insideEndTop' }
        }
      }
    ]
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height: '320px', width: '100%' }" autoresize />
</template>
