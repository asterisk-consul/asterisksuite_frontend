<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const props = defineProps<{
  data?: {
    quotes: { total: number; totalValue: number }
    orders: { total: number; totalValue: number }
    remitos: { total: number }
    invoices: { total: number; totalValue: number }
    creditNotes: { total: number; totalValue: number }
    debitNotes: { total: number; totalValue: number }
    hr: { totalVales: number }
    stock: { totalProducts: number }
    costing: { totalProducts: number; costed: number; uncosted: number }
  }
  loading?: boolean
}>()

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const chartData = computed(() => {
  if (!props.data) return { categories: [], series: [] }

  const categories = [
    { label: 'Presupuestos', value: props.data.quotes.total, permission: 'documents.read' },
    { label: 'OVs', value: props.data.orders.total, permission: 'documents.read' },
    { label: 'Facturas', value: props.data.invoices.total, permission: 'documents.read' },
    { label: 'Notas de crédito', value: props.data.creditNotes.total, permission: 'documents.read' },
    { label: 'Notas de débito', value: props.data.debitNotes.total, permission: 'documents.read' },
    { label: 'Remitos', value: props.data.remitos.total, permission: 'documents.read' },
    { label: 'Vales', value: props.data.hr.totalVales },
    { label: 'Costeados', value: props.data.costing?.costed ?? 0, permission: 'products.read' },
    { label: 'Sin costear', value: props.data.costing?.uncosted ?? 0, permission: 'products.read' },
  ]

  const filtered = categories.filter((c) => !c.permission || isOwnerOrAdmin.value || hasPermission(c.permission))

  return {
    categories: filtered.map((c) => c.label),
    series: [
      {
        name: 'Cantidad',
        data: filtered.map((c) => c.value),
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

    <div v-if="loading" class="h-64">
      <USkeleton class="w-full h-full rounded-lg" />
    </div>

    <div v-else-if="!data || chartData.categories.length === 0" class="h-64 flex items-center justify-center text-muted text-sm">
      Sin datos disponibles
    </div>

    <div v-else class="h-64">
      <VChart :option="{
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: chartData.categories,
          axisLabel: { fontSize: 10, interval: 0, rotate: 30 },
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
        grid: { left: 40, right: 10, top: 10, bottom: 55 },
      }" autoresize class="w-full h-full" />
    </div>
  </UPageCard>
</template>
