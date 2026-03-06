import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

export interface TransferRate {
  id: string
  company_id: string
  name: string
  rate_type: string
  description?: string | null
  active: boolean
  created_at: string
}

function getActiveColor(active: boolean) {
  return active ? 'success' : 'error'
}

function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const columns: TableColumn<TransferRate>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre'
  },
  {
    accessorKey: 'rate_type',
    header: 'Tipo'
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => row.original.description || '—'
  },
  {
    accessorKey: 'active',
    header: 'Activo',
    cell: ({ row }) =>
      h(
        UBadge,
        { variant: 'subtle', color: getActiveColor(row.original.active) },
        () => (row.original.active ? 'Sí' : 'No')
      )
  },
  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => formatDate(row.original.created_at)
  }
]
