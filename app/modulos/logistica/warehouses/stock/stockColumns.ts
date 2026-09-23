import { h } from 'vue'
import { NuxtLink, UBadge, UProgress } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { WarehouseStockItem } from './stock.types'

const quantity = (value: string | number | null | undefined) => Number(value) || 0
const formatQuantity = (value: number) => value.toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export const warehouseStockColumns: TableColumn<WarehouseStockItem>[] = [
  {
    id: 'products',
    header: 'Producto',
    accessorFn: row => `${row.products.name} ${row.products.sku ?? ''}`.trim(),
    cell: ({ row }) => h('div', { class: 'min-w-[220px] space-y-0.5' }, [
      h(NuxtLink, {
        to: `/productos/${row.original.products.id}`,
        class: 'font-medium text-highlighted hover:text-primary hover:underline'
      }, () => row.original.products.name),
      h('p', { class: 'text-xs text-muted' }, row.original.products.sku || 'Sin SKU')
    ])
  },
  {
    id: 'sku',
    header: 'SKU',
    accessorFn: row => row.products.sku ?? '',
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.products.sku || '—')
  },
  {
    accessorKey: 'quantity',
    header: 'Stock físico',
    cell: ({ row }) => h('span', { class: 'font-semibold tabular-nums' }, formatQuantity(quantity(row.original.quantity)))
  },
  {
    accessorKey: 'reserved_quantity',
    header: 'Reservado',
    cell: ({ row }) => {
      const total = quantity(row.original.quantity)
      const reserved = quantity(row.original.reserved_quantity)
      const percentage = total > 0 ? Math.min(100, (reserved / total) * 100) : 0
      return h('div', { class: 'min-w-[130px] space-y-1' }, [
        h('span', { class: reserved > 0 ? 'font-semibold text-warning tabular-nums' : 'text-muted tabular-nums' }, formatQuantity(reserved)),
        h(UProgress, { modelValue: percentage, color: reserved > 0 ? 'warning' : 'neutral', size: 'xs' })
      ])
    }
  },
  {
    id: 'available_quantity',
    header: 'Disponible',
    accessorFn: row => quantity(row.quantity) - quantity(row.reserved_quantity),
    cell: ({ row }) => {
      const available = quantity(row.original.quantity) - quantity(row.original.reserved_quantity)
      return h('span', {
        class: available > 0 ? 'font-semibold text-success tabular-nums' : 'font-semibold text-error tabular-nums'
      }, formatQuantity(available))
    }
  },
  {
    id: 'availability_status',
    header: 'Situación',
    accessorFn: row => {
      const total = quantity(row.quantity)
      const reserved = quantity(row.reserved_quantity)
      if (total - reserved <= 0) return 'Sin disponibilidad'
      if (reserved > 0) return 'Con reservas'
      return 'Disponible'
    },
    cell: ({ row }) => {
      const total = quantity(row.original.quantity)
      const reserved = quantity(row.original.reserved_quantity)
      const available = total - reserved
      const config = available <= 0
        ? { label: 'Sin disponibilidad', color: 'error' as const }
        : reserved > 0
          ? { label: 'Con reservas', color: 'warning' as const }
          : { label: 'Disponible', color: 'success' as const }
      return h(UBadge, { ...config, variant: 'subtle', size: 'sm' })
    }
  }
]
