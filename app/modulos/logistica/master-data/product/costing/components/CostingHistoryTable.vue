<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCosting } from '../composables/useCosting'
import type { CostHistoryRow, CostHistoryBreakdown } from '../types/costing.types'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const props = defineProps<{
  productId: string
  currencyId: string
}>()

const { history, loading, formatCurrency } = useCosting(props.productId, props.currencyId)

const COST_SOURCE_COLORS: Record<string, string> = {
  BOM: 'blue',
  ENGINEERING: 'purple',
  MANUAL: 'gray',
  PURCHASE: 'green',
  RATE: 'orange'
}

// El backend ya devuelve breakdowns anidados (solo raíces con children)
const tableData = computed(() =>
  history.value.map((item) => ({
    ...item,
    children: item.breakdowns?.length ? item.breakdowns : undefined
  }))
)

// Helper: un nodo es "breakdown" si tiene component_product_id
const isBreakdown = (original: any) => 'component_product_id' in original

// Helper: un breakdown es semi-terminado si tiene hijos
const isSemiFinished = (original: any) => isBreakdown(original) && original.children?.length > 0

const columns: TableColumn<CostHistoryRow | CostHistoryBreakdown>[] = [
  {
    id: 'expand',
    header: '',
    cell: ({ row }) => {
      if (!row.getCanExpand()) {
        return h('div', { style: { paddingLeft: `${row.depth * 1.5 + 1.5}rem` } })
      }
      return h(
        'div',
        {
          class: 'flex items-center',
          style: { paddingLeft: `${row.depth * 1.5}rem` }
        },
        [
          h(UButton, {
            color: 'neutral',
            variant: 'outline',
            size: 'xs',
            icon: row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus',
            ui: { base: 'p-0 rounded-sm', leadingIcon: 'size-4' },
            onClick: row.getToggleExpandedHandler()
          })
        ]
      )
    }
  },
  {
    id: 'version_or_component',
    header: 'Versión / Componente',
    cell: ({ row }) => {
      const original = row.original as any

      if (isBreakdown(original)) {
        return h(
          'div',
          {
            class: 'flex flex-col gap-0.5',
            style: { paddingLeft: `${row.depth * 1.5}rem` }
          },
          [
            h('div', { class: 'flex items-center gap-1.5' }, [
              // Indicador visual: semi-terminado vs materia prima
              isSemiFinished(original)
                ? h(UBadge, { label: 'Conjunto', color: 'warning', variant: 'subtle', size: 'xs' })
                : h(UBadge, { label: 'Material', color: 'info', variant: 'subtle', size: 'xs' }),
              h('span', { class: 'text-sm font-medium' }, original.component_product?.name ?? '—')
            ]),
            original.component_product?.sku
              ? h('span', { class: 'text-xs text-muted font-mono' }, original.component_product.sku)
              : null,
            original.component_variant?.name
              ? h('span', { class: 'text-xs text-muted' }, `Variante: ${original.component_variant.name}`)
              : null
          ]
        )
      }

      // Fila raíz (snapshot)
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-semibold' }, `v${original.version}`),
          original.active
            ? h(UBadge, { label: 'Activo', color: 'success', variant: 'subtle', size: 'xs' })
            : h(UBadge, { label: 'Inactivo', color: 'neutral', variant: 'subtle', size: 'xs' })
        ]),
        original.products?.sku ? h('span', { class: 'text-xs text-muted font-mono' }, original.products.sku) : null
      ])
    }
  },
  {
    id: 'source_or_quantity',
    header: 'Fuente / Cantidad',
    cell: ({ row }) => {
      const original = row.original as any
      if (isBreakdown(original)) {
        return h(
          'span',
          { class: 'text-sm text-muted' },
          `× ${Number(original.quantity).toLocaleString('es-AR', { maximumFractionDigits: 3 })}`
        )
      }
      return h(UBadge, {
        label: original.cost_source,
        color: COST_SOURCE_COLORS[original.cost_source] ?? 'neutral',
        variant: 'soft',
        size: 'xs'
      })
    }
  },
  {
    id: 'material_or_unit_cost',
    header: 'Material / Costo unit.',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if (isBreakdown(original)) {
        // Semi-terminados no tienen costo unitario propio
        if (isSemiFinished(original)) return h('span', { class: 'text-muted text-sm' }, '—')
        return h('span', { class: 'text-sm tabular-nums' }, formatCurrency(original.unit_cost))
      }
      return h('span', { class: 'tabular-nums' }, formatCurrency(original.material_cost))
    }
  },
  {
    id: 'labor',
    header: 'Mano de obra',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if (isBreakdown(original)) return h('span', { class: 'text-muted' }, '—')
      return h('span', { class: 'tabular-nums' }, formatCurrency(original.labor_cost))
    }
  },
  {
    id: 'overhead',
    header: 'Overhead',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if (isBreakdown(original)) return h('span', { class: 'text-muted' }, '—')
      return h('span', { class: 'tabular-nums' }, formatCurrency(original.overhead_cost))
    }
  },
  {
    id: 'total_cost',
    header: 'Total',
    meta: { class: { th: 'text-right', td: 'text-right font-semibold' } },
    cell: ({ row }) => {
      const original = row.original as any

      if (isBreakdown(original)) {
        // Materia prima: no mostrar total (ya está en el conjunto padre)
        if (!isSemiFinished(original)) {
          return h('span', { class: 'text-muted text-sm' }, '—')
        }
        // Semi-terminado: mostrar su total
        return h(
          'span',
          { class: 'tabular-nums text-violet-600 dark:text-violet-400' },
          formatCurrency(original.total_cost)
        )
      }

      // Snapshot raíz: mostrar total con símbolo de moneda
      const symbol = original.currencies?.symbol ?? '$'
      return h('span', { class: 'tabular-nums' }, formatCurrency(original.total_cost, symbol))
    }
  },
  {
    id: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => {
      const original = row.original as any
      if (isBreakdown(original)) return null
      return new Date(original.created_at).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
]

const expanded = ref({})
</script>

<template>
  <div class="space-y-3">
    <UTable
      v-model:expanded="expanded"
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :get-sub-rows="(row) => (row as any).children"
      :ui="{
        base: 'border-separate border-spacing-0',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        tr: 'group',
        td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default'
      }"
    />
    <p v-if="!loading && !tableData.length" class="text-center text-sm text-muted py-8">
      Sin historial de costos. Calculá el costo para generar el primer registro.
    </p>
  </div>
</template>
