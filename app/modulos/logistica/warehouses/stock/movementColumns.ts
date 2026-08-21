import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { StockMovement } from '~/modulos/logistica/warehouses/stock/stock.types'

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  'MANUAL': 'Manual',
  'TRANSFER': 'Transferencia',
  'PICKING': 'Picking',
  'REMOVAL': 'Baja',
  'DOCUMENT': 'Documento',
  'DELIVERY_NOTE': 'Remito'
}

const MOVEMENT_TYPE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  'MANUAL': 'neutral',
  'TRANSFER': 'info',
  'PICKING': 'warning',
  'REMOVAL': 'error',
  'DOCUMENT': 'success',
  'DELIVERY_NOTE': 'success'
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  'STOCK_TRANSFER': 'Transferencia entre depósitos',
  'PALLET_TRANSFER': 'Transferencia de pallet',
  'STOCK_REMOVAL': 'Baja de stock',
  'PICKING': 'Picking directo',
  'PICKING_ORDER': 'Orden de picking',
  'document': 'Documento ERP',
  'DELIVERY_NOTE': 'Remito de logística'
}

export const movementColumns: TableColumn<StockMovement>[] = [
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => {
      const raw = row.getValue<string>('created_at')
      if (!raw) return '—'
      const date = new Date(raw)
      return h('span', { class: 'text-sm' }, date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
  },
  {
    accessorKey: 'products',
    header: 'Producto',
    accessorFn: (row) => (row as any).products?.name ?? '',
    cell: ({ row }) => {
      const product = (row.original as any).products
      if (!product) return '—'
      return h('div', [
        h('span', { class: 'font-medium' }, product.name),
        product.sku ? h('span', { class: 'text-muted text-xs ml-1' }, `(${product.sku})`) : null
      ])
    }
  },
  {
    accessorKey: 'direction',
    header: 'Dirección',
    cell: ({ row }) => {
      const direction = row.getValue<string>('direction')
      const label = direction === 'IN' ? 'Entrada' : 'Salida'
      const color = direction === 'IN' ? 'success' : 'error'
      return h(UBadge, { label, color, variant: 'subtle', size: 'xs' })
    }
  },
  {
    accessorKey: 'movement_type',
    header: 'Tipo',
    accessorFn: (row) => MOVEMENT_TYPE_LABELS[row.movement_type] ?? row.movement_type,
    cell: ({ row }) => {
      const type = row.original.movement_type
      const label = MOVEMENT_TYPE_LABELS[type] ?? type
      const color = MOVEMENT_TYPE_COLORS[type] ?? 'neutral'
      return h(UBadge, { label, color, variant: 'subtle', size: 'xs' })
    }
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    cell: ({ row }) => {
      const quantity = parseFloat(row.getValue<string>('quantity'))
      const direction = row.original.direction
      const prefix = direction === 'IN' ? '+' : '-'
      const color = direction === 'IN' ? 'text-green-600' : 'text-red-600'
      return h('span', { class: `font-semibold ${color}` }, `${prefix}${quantity.toFixed(2)}`)
    }
  },
  {
    accessorKey: 'balance_before',
    header: 'Saldo',
    cell: ({ row }) => {
      const balance = (row.original as any).balance_before
      if (balance === null || balance === undefined) return '—'
      return h('span', { class: 'text-sm font-medium' }, Number(balance).toFixed(2))
    }
  },
  {
    accessorKey: 'reference_type',
    header: 'Referencia',
    cell: ({ row }) => {
      const refType = row.getValue<string>('reference_type')
      if (!refType) return '—'
      const label = REFERENCE_TYPE_LABELS[refType] ?? refType
      return h('span', { class: 'text-sm text-muted' }, label)
    }
  },
  {
    accessorKey: 'linked_warehouse_name',
    header: 'Depósito vinculado',
    cell: ({ row }) => {
      const name = (row.original as any).linked_warehouse_name
      const direction = row.original.direction
      if (!name) return '—'
      const arrow = direction === 'OUT' ? '→' : '←'
      return h('span', { class: 'text-sm font-medium' }, `${arrow} ${name}`)
    }
  },
  {
    accessorKey: 'created_by',
    header: 'Usuario',
    cell: ({ row }) => {
      const name = (row.original as any).created_by_name
      const id = row.getValue<string>('created_by')
      if (name) return h('span', { class: 'text-sm font-medium' }, name)
      if (id) return h('span', { class: 'text-sm font-mono text-muted' }, id.slice(0, 8))
      return '—'
    }
  }
]

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value
}))

export const DIRECTION_OPTIONS = [
  { label: 'Entrada', value: 'IN' },
  { label: 'Salida', value: 'OUT' }
]
