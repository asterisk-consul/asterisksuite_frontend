<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useCosting } from '../composables/useCosting'
import type { ParetoItem, ParetoMode } from '../types/costing.types'

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const { pareto, loading, loadPareto, formatCurrency, formatPercentage } = useCosting(props.productId, props.currencyId)

const mode = ref<ParetoMode>('materials')

const modeOptions = [
  { label: 'Solo materiales', value: 'materials' },
  { label: 'Completo (con MO y OH)', value: 'full' }
]

watch(
  mode,
  async (val) => {
    await loadPareto(val)
  },
  { immediate: true }
)

const columns: TableColumn<ParetoItem>[] = [
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
  {
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
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-muted">
          Mostrando
          <span class="font-semibold text-highlighted">
            {{ pareto?.vital_items_count ?? 0 }}
          </span>
          ítems vitales ({{ pareto?.vital_items_percentage ?? 0 }}% del total) que representan el 80% del costo
        </p>
      </div>
      <USelectMenu v-model="mode" :options="modeOptions" value-attribute="value" option-attribute="label" size="sm" />
    </div>

    <!-- Resumen total -->
    <div v-if="pareto" class="flex items-center justify-between rounded-lg border border-default bg-elevated px-4 py-3">
      <span class="text-sm text-muted">Costo total analizado</span>
      <span class="text-lg font-bold tabular-nums">
        {{ formatCurrency(pareto.total_cost) }}
      </span>
    </div>

    <!-- Tabla -->
    <UTable
      :data="pareto?.items ?? []"
      :columns="columns"
      :loading="loading"
      :ui="{
        tr: 'group',
        td: 'border-b border-default'
      }"
      :row-class="(row) => (row.original.is_vital ? 'bg-primary-50/30 dark:bg-primary-950/20' : '')"
    />

    <p v-if="!loading && !pareto?.items?.length" class="text-center text-sm text-muted py-8">
      No hay datos de pareto disponibles. Calculá el costo primero.
    </p>
  </div>
</template>
