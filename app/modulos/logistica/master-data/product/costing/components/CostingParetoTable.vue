<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'
import { useCosting } from '../composables/useCosting'
import type { ParetoItem, ParetoMode } from '../types/costing.types'
import ParetoBarChart from './ParetoBarChart.vue'
import ParetoPieChart from './ParetoPieChart.vue'

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const { pareto, loading, loadPareto, formatCurrency, formatPercentage } = useCosting(props.productId, props.currencyId)

const mode = ref<ParetoMode>('full')

const modeOptions: { label: string; value: ParetoMode }[] = [
  { label: 'Solo materiales', value: 'materials' },
  { label: 'Completo (con MO y OH)', value: 'full' },
  { label: 'Solo conjuntos', value: 'assemblies' }
]

watch(
  mode,
  async (val) => {
    await loadPareto(val)
  },
  { immediate: true }
)

const isAssemblies = computed(() => mode.value === 'assemblies')

const allColumns: TableColumn<ParetoItem>[] = [
  {
    accessorKey: 'product_name',
    header: 'Componente',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-medium text-sm' }, item.product_name),
        item.product_sku ? h('span', { class: 'text-xs text-muted font-mono' }, item.product_sku) : null,
        item.variant_name ? h('span', { class: 'text-xs text-muted' }, item.variant_name) : null
      ])
    }
  },
  {
    accessorKey: 'occurrences',
    header: 'Ramas',
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const count = row.original.occurrences
      if (count <= 1) return h('span', { class: 'text-muted text-sm' }, '—')
      return h(resolveComponent('UBadge'), {
        label: `×${count}`,
        color: 'warning',
        variant: 'subtle',
        size: 'xs'
      })
    }
  },
  {
    accessorKey: 'total_quantity',
    header: 'Cantidad total',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => h('span', { class: 'tabular-nums text-sm' }, row.original.total_quantity)
  },
  {
    accessorKey: 'total_cost',
    header: 'Costo total',
    meta: { class: { th: 'text-right', td: 'text-right font-semibold' } },
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, formatCurrency(row.original.total_cost))
  },
  {
    accessorKey: 'percentage',
    header: '% del total',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => h('span', { class: 'tabular-nums text-sm' }, formatPercentage(row.original.percentage))
  },
  // Columnas solo para materials/full
  {
    id: 'cumulative',
    accessorKey: 'cumulative',
    header: '% acumulado',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        h('span', { class: 'tabular-nums text-sm' }, formatPercentage(item.cumulative)),
        h('div', { class: 'w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden' }, [
          h('div', {
            class: `h-full rounded-full transition-all ${item.is_vital ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`,
            style: { width: `${Math.min(item.cumulative, 100)}%` }
          })
        ])
      ])
    }
  },
  {
    id: 'vital',
    header: 'Vital',
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) =>
      row.original.is_vital
        ? h(resolveComponent('UBadge'), { label: 'Vital', color: 'primary', variant: 'subtle', size: 'xs' })
        : h(resolveComponent('UBadge'), { label: 'Trivial', color: 'neutral', variant: 'subtle', size: 'xs' })
  }
]

// En modo assemblies ocultar columnas de pareto que no aplican
const columns = computed(() =>
  isAssemblies.value ? allColumns.filter((c) => c.id !== 'cumulative' && c.id !== 'vital') : allColumns
)

const view = ref<'table' | 'charts'>('table')

const viewOptions: { label: string; value: 'table' | 'charts'; icon: string }[] = [
  { label: 'Tabla', value: 'table', icon: 'i-lucide-table' },
  { label: 'Gráficos', value: 'charts', icon: 'i-lucide-bar-chart-2' }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-sm text-muted">
        <template v-if="isAssemblies">
          Mostrando costo por conjunto —
          <span class="font-semibold text-highlighted">{{ pareto?.items?.length ?? 0 }}</span>
          conjuntos analizados
        </template>
        <template v-else>
          Mostrando
          <span class="font-semibold text-highlighted">{{ pareto?.vital_items_count ?? 0 }}</span>
          ítems vitales ({{ pareto?.vital_items_percentage ?? 0 }}% del total) que representan el 80% del costo
        </template>
      </p>
      <div class="flex items-center gap-2">
        <USelectMenu v-model="mode" :items="modeOptions" value-key="value" size="sm" />
        <UButtonGroup size="sm">
          <UButton
            v-for="opt in viewOptions"
            :key="opt.value"
            :icon="opt.icon"
            :label="opt.label"
            :color="view === opt.value ? 'primary' : 'neutral'"
            :variant="view === opt.value ? 'solid' : 'ghost'"
            @click="view = opt.value"
          />
        </UButtonGroup>
      </div>
    </div>

    <!-- Resumen total -->
    <div v-if="pareto" class="flex items-center justify-between rounded-lg border border-default bg-elevated px-4 py-3">
      <span class="text-sm text-muted">Costo total analizado</span>
      <span class="text-lg font-bold tabular-nums">{{ formatCurrency(pareto.total_cost) }}</span>
    </div>

    <!-- Vista tabla -->
    <template v-if="view === 'table'">
      <UTable
        :data="pareto?.items ?? []"
        :columns="columns"
        :loading="loading"
        :ui="{ tr: 'group', td: 'border-b border-default' }"
        :row-class="
          (row: Row<ParetoItem>) =>
            !isAssemblies && row.original.is_vital ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''
        "
      />
    </template>

    <!-- Vista gráficos -->
    <template v-else-if="pareto?.items?.length">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-sm font-medium text-highlighted mb-3">
            {{ isAssemblies ? 'Costo por conjunto' : 'Análisis de Pareto' }}
          </p>
          <ParetoBarChart
            :items="pareto.items"
            :format-currency="formatCurrency"
            :format-percentage="formatPercentage"
            :mode="mode"
          />
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-sm font-medium text-highlighted mb-3">Distribución de costos</p>
          <ParetoPieChart
            :items="pareto.items"
            :total-cost="pareto.total_cost"
            :format-currency="formatCurrency"
            :format-percentage="formatPercentage"
            :mode="mode"
          />
        </div>
      </div>
    </template>

    <p v-if="!loading && !pareto?.items?.length" class="text-center text-sm text-muted py-8">
      No hay datos de pareto disponibles. Calculá el costo primero.
    </p>
  </div>
</template>
