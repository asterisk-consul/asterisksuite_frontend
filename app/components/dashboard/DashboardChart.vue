<script setup lang="ts">
const props = defineProps<{
  data?: {
    quotes: { total: number; totalValue: number }
    orders: { total: number; totalValue: number }
    remitos: { total: number }
    hr: { totalVales: number }
    stock: { totalProducts: number }
  }
  loading?: boolean
}>()

const chartData = computed(() => {
  if (!props.data) return { categories: [], series: [] }

  return {
    categories: ['Presupuestos', 'OVs', 'Remitos', 'Vales', 'Productos'],
    series: [
      {
        name: 'Cantidad',
        data: [
          props.data.quotes.total,
          props.data.orders.total,
          props.data.remitos.total,
          props.data.hr.totalVales,
          props.data.stock.totalProducts,
        ],
      },
    ],
  }
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-bar-chart-3" class="size-5 text-info" />
        <h3 class="text-sm font-semibold">Resumen General</h3>
      </div>
    </template>

    <div v-if="loading" class="h-48">
      <USkeleton class="w-full h-full rounded-lg" />
    </div>

    <div v-else-if="!data" class="h-48 flex items-center justify-center text-muted text-sm">
      Sin datos disponibles
    </div>

    <div v-else class="h-48">
      <VChart :option="{
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: chartData.categories,
          axisLabel: { fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          axisLabel: { fontSize: 10 },
        },
        series: chartData.series.map(s => ({
          ...s,
          type: 'bar',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#60a5fa' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        })),
        grid: { left: 40, right: 10, top: 10, bottom: 30 },
      }" autoresize class="w-full h-full" />
    </div>
  </UPageCard>
</template>
