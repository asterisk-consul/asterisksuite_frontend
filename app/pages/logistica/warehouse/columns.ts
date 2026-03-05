import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Warehouse } from '~/types/logistica/warehouses/warehouse'

export const columns: TableColumn<Warehouse & { locations?: any }>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => {
      const id = row.getValue('id') as string
      return `#${id.slice(0, 8)}`
    }
  },

  {
    accessorKey: 'name',
    header: 'Depósito'
  },

  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => {
      const code = row.getValue('code') as string | null | undefined
      return code ?? '—'
    }
  },

  {
    id: 'location',
    header: 'Ubicación',
    cell: ({ row }) => {
      const location = row.original.locations

      if (!location) return 'Sin asignar'

      const address = location.address
      const city = location.city ?? ''

      // Si tiene address → address + city
      // Si no → solo city
      return address ? `${address} - ${city}` : city
    }
  },

  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => {
      const active = row.getValue('active') as boolean

      return h(
        UBadge,
        {
          variant: 'subtle',
          color: active ? 'success' : 'error'
        },
        () => (active ? 'Activo' : 'Inactivo')
      )
    }
  },

  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string

      return new Date(date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
]
