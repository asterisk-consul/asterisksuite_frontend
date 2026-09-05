<script setup lang="ts">
import { useMySalesStore } from '~/modulos/erp/sales/my-sales/my-sales.store'

definePageMeta({ middleware: ['auth'] })

const store = useMySalesStore()
const { analysis, loading } = storeToRefs(store)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

const percentColor = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 'text-green-600' : 'text-muted'
  const pct = current - previous
  return pct >= 0 ? 'text-green-600' : 'text-red-600'
}

const formatMonth = (period: string) => {
  const [year, month] = period.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

onMounted(async () => {
  await store.fetchAnalysis()
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Análisis de Ventas" />

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <USkeleton v-for="i in 2" :key="i" class="h-64" />
    </div>

    <div v-else-if="analysis?.current && analysis?.previous" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Mes actual -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ formatMonth(analysis.current.period) }}</h3>
        </template>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-muted">Ventas</span>
            <span class="font-semibold">{{ formatCurrency(analysis.current.ventas) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Facturado</span>
            <span class="font-semibold text-blue-600">{{ formatCurrency(analysis.current.facturado) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Cobrado</span>
            <span class="font-semibold text-green-600">{{ formatCurrency(analysis.current.cobrado) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Pendiente</span>
            <span class="font-semibold text-red-600">{{ formatCurrency(analysis.current.pendiente) }}</span>
          </div>
          <div class="flex justify-between border-t pt-3">
            <span class="text-sm text-muted">Órdenes</span>
            <span class="font-semibold">{{ analysis.current.cantidad_ov }}</span>
          </div>
        </div>
      </UCard>

      <!-- Mes anterior -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ formatMonth(analysis.previous.period) }}</h3>
        </template>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-muted">Ventas</span>
            <span class="font-semibold">{{ formatCurrency(analysis.previous.ventas) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Facturado</span>
            <span class="font-semibold text-blue-600">{{ formatCurrency(analysis.previous.facturado) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Cobrado</span>
            <span class="font-semibold text-green-600">{{ formatCurrency(analysis.previous.cobrado) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted">Pendiente</span>
            <span class="font-semibold text-red-600">{{ formatCurrency(analysis.previous.pendiente) }}</span>
          </div>
          <div class="flex justify-between border-t pt-3">
            <span class="text-sm text-muted">Órdenes</span>
            <span class="font-semibold">{{ analysis.previous.cantidad_ov }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Comparación -->
    <UCard v-if="!loading && analysis?.current && analysis?.previous">
      <template #header>
        <h3 class="font-semibold">Comparación</h3>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="text-left py-2 text-muted">Métrica</th>
              <th class="text-right py-2 text-muted">{{ formatMonth(analysis.previous.period) }}</th>
              <th class="text-right py-2 text-muted">{{ formatMonth(analysis.current.period) }}</th>
              <th class="text-right py-2 text-muted">Variación</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b">
              <td class="py-2">Ventas</td>
              <td class="text-right py-2">{{ formatCurrency(analysis.previous.ventas) }}</td>
              <td class="text-right py-2 font-semibold">{{ formatCurrency(analysis.current.ventas) }}</td>
              <td class="text-right py-2" :class="percentColor(analysis.current.ventas, analysis.previous.ventas)">
                {{ formatPercent(analysis.current.ventas, analysis.previous.ventas) }}
              </td>
            </tr>
            <tr class="border-b">
              <td class="py-2">Facturado</td>
              <td class="text-right py-2">{{ formatCurrency(analysis.previous.facturado) }}</td>
              <td class="text-right py-2 font-semibold">{{ formatCurrency(analysis.current.facturado) }}</td>
              <td class="text-right py-2" :class="percentColor(analysis.current.facturado, analysis.previous.facturado)">
                {{ formatPercent(analysis.current.facturado, analysis.previous.facturado) }}
              </td>
            </tr>
            <tr class="border-b">
              <td class="py-2">Cobrado</td>
              <td class="text-right py-2">{{ formatCurrency(analysis.previous.cobrado) }}</td>
              <td class="text-right py-2 font-semibold">{{ formatCurrency(analysis.current.cobrado) }}</td>
              <td class="text-right py-2" :class="percentColor(analysis.current.cobrado, analysis.previous.cobrado)">
                {{ formatPercent(analysis.current.cobrado, analysis.previous.cobrado) }}
              </td>
            </tr>
            <tr class="border-b">
              <td class="py-2">Pendiente</td>
              <td class="text-right py-2">{{ formatCurrency(analysis.previous.pendiente) }}</td>
              <td class="text-right py-2 font-semibold">{{ formatCurrency(analysis.current.pendiente) }}</td>
              <td class="text-right py-2" :class="percentColor(analysis.current.pendiente, analysis.previous.pendiente)">
                {{ formatPercent(analysis.current.pendiente, analysis.previous.pendiente) }}
              </td>
            </tr>
            <tr>
              <td class="py-2 font-medium">Órdenes</td>
              <td class="text-right py-2">{{ analysis.previous.cantidad_ov }}</td>
              <td class="text-right py-2 font-semibold">{{ analysis.current.cantidad_ov }}</td>
              <td class="text-right py-2" :class="percentColor(analysis.current.cantidad_ov, analysis.previous.cantidad_ov)">
                {{ formatPercent(analysis.current.cantidad_ov, analysis.previous.cantidad_ov) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard v-else-if="!loading">
      <div class="text-center py-8 text-muted">
        No hay datos suficientes para el análisis.
      </div>
    </UCard>
  </UPage>
</template>
