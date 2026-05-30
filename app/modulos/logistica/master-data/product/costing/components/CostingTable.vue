<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCostingStore } from '~/modulos/logistica/master-data/costing/store/costing.store'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const costingStore = useCostingStore()

// Tipos adaptados a tu API
// Tipos actualizados
type Breakdown = {
  id: string
  product_cost_id: string
  component_product_id: string
  component_variant_id: string | null
  quantity: string
  unit_cost: string
  total_cost: string
  level: number
  created_at: string
  component_product: {
    name: string
    sku: string | null
  }
  component_variant: {
    name: string
    sku: string | null
  } | null
}

type ProductCostRow = {
  id: string
  version: number
  cost_source: string
  material_cost: string
  labor_cost: string
  overhead_cost: string
  total_cost: string
  active: boolean
  notes: string | null
  created_at: string
  currencies: {
    code: string
    symbol: string
    name: string
  }
  products: {
    name: string
    sku: string | null
  }
  children?: Breakdown[]
}
// Props del componente (recibe el productId desde el padre)
const props = defineProps<{ productId: string }>()

// Mapear los datos del store al formato de la tabla
const tableData = computed<ProductCostRow[]>(() =>
  costingStore.history.map((item) => ({
    ...item,
    children: item.breakdowns?.length ? item.breakdowns : undefined
  }))
)

const formatCurrency = (value: string | number, symbol = '$') => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${symbol} ${new Intl.NumberFormat('es-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)}`
}

const columns: TableColumn<ProductCostRow | Breakdown>[] = [
  {
    id: 'expand',
    header: '',
    cell: ({ row }) => {
      // Solo las filas padre tienen el botón de expandir
      if (!row.getCanExpand()) {
        return h('div', {
          style: { paddingLeft: `${row.depth * 1.5 + 1.5}rem` }
        })
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

      // Fila hija (breakdown)
      if ('component_product_id' in original) {
        return h(
          'div',
          {
            class: 'flex flex-col gap-0.5',
            style: { paddingLeft: `${row.depth * 1.5}rem` }
          },
          [
            h('span', { class: 'text-sm font-medium' }, original.component_product?.name ?? '—'),
            original.component_product?.sku
              ? h('span', { class: 'text-xs text-muted font-mono' }, original.component_product.sku)
              : null,
            original.component_variant?.name
              ? h('span', { class: 'text-xs text-muted' }, `Variante: ${original.component_variant.name}`)
              : null
          ]
        )
      }

      // Fila padre
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-semibold' }, `v${original.version}`),
          original.active
            ? h(UBadge, {
                label: 'Activo',
                color: 'success',
                variant: 'subtle',
                size: 'xs'
              })
            : h(UBadge, {
                label: 'Inactivo',
                color: 'neutral',
                variant: 'subtle',
                size: 'xs'
              })
        ]),
        h('span', { class: 'text-xs text-muted font-mono' }, original.products?.sku ?? '')
      ])
    }
  },
  {
    id: 'source_or_quantity',
    header: 'Fuente / Cantidad',
    cell: ({ row }) => {
      const original = row.original as any
      if ('component_product_id' in original) {
        return h('span', { class: 'text-sm' }, `Cant: ${original.quantity}`)
      }
      return h(UBadge, {
        label: original.cost_source,
        color: 'info',
        variant: 'soft',
        size: 'xs'
      })
    }
  },
  {
    id: 'material_or_unit_cost',
    header: 'Material / Costo Unit.',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if ('component_product_id' in original) {
        return h('span', { class: 'text-sm' }, formatCurrency(original.unit_cost))
      }
      return h('span', {}, formatCurrency(original.material_cost))
    }
  },
  {
    id: 'labor_or_empty',
    header: 'Mano de Obra',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if ('component_product_id' in original) return '—'
      return formatCurrency(original.labor_cost)
    }
  },
  {
    id: 'overhead_or_empty',
    header: 'Overhead',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const original = row.original as any
      if ('component_product_id' in original) return '—'
      return formatCurrency(original.overhead_cost)
    }
  },
  {
    id: 'total_cost',
    header: 'Total',
    meta: { class: { th: 'text-right', td: 'text-right font-semibold' } },
    cell: ({ row }) => {
      const original = row.original as any
      const symbol = 'component_product_id' in original ? '$' : (original.currencies?.symbol ?? '$')
      return formatCurrency(original.total_cost, symbol)
    }
  },
  {
    id: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => {
      const original = row.original as any
      return new Date(original.created_at).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
]

const expanded = ref({})

// Cargar historial al montar
onMounted(() => {
  costingStore.fetchHistory(props.productId)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Resumen rápido -->
    <div class="grid grid-cols-4 gap-3">
      <UCard>
        <p class="text-xs text-muted">Último costo total</p>
        <p class="text-lg font-bold">
          {{ formatCurrency(costingStore.latestCost) }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">Material</p>
        <p class="text-lg font-bold">
          {{ formatCurrency(costingStore.latestMaterialCost) }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">Mano de obra</p>
        <p class="text-lg font-bold">
          {{ formatCurrency(costingStore.latestLaborCost) }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">Overhead</p>
        <p class="text-lg font-bold">
          {{ formatCurrency(costingStore.latestOverheadCost) }}
        </p>
      </UCard>
    </div>

    <!-- Tabla -->
    <UTable
      v-model:expanded="expanded"
      :data="tableData"
      :columns="columns"
      :loading="costingStore.loading"
      :get-sub-rows="(row) => (row as any).children"
      class="flex-1"
      :ui="{
        base: 'border-separate border-spacing-0',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        tr: 'group',
        td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default'
      }"
    />
  </div>
</template>
