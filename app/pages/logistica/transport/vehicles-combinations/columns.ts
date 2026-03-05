import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { VehicleCombination } from '~/types/logistica/transport/vehicles-combinations'
import type { BadgeColor } from '~/types/colors.types'

function formatVehicle(v: any) {
  if (!v) return '—'

  const brand = v.brand ?? ''
  const model = v.model ?? ''

  return `${v.plate} ${brand} ${model}`.trim()
}

function getStatus(validUntil: string | null): {
  label: string
  color: BadgeColor
} {
  if (!validUntil) return { label: 'Activa', color: 'success' }

  const today = new Date()
  const end = new Date(validUntil)

  if (end < today) return { label: 'Finalizada', color: 'neutral' }

  return { label: 'Activa', color: 'success' }
}

export const columns: TableColumn<VehicleCombination>[] = [
  {
    id: 'tractor',
    header: 'Tractor',
    cell: ({ row }) => formatVehicle(row.original.tractor)
  },

  {
    id: 'trailer',
    header: 'Trailer',
    cell: ({ row }) => formatVehicle(row.original.trailer)
  },

  {
    accessorKey: 'valid_from',
    header: 'Desde',
    cell: ({ row }) =>
      new Date(row.original.valid_from).toLocaleDateString('es-AR')
  },

  {
    accessorKey: 'valid_until',
    header: 'Hasta',
    cell: ({ row }) =>
      row.original.valid_until
        ? new Date(row.original.valid_until).toLocaleDateString('es-AR')
        : '—'
  },

  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = getStatus(row.original.valid_until)

      return h(
        UBadge,
        {
          color: status.color,
          variant: 'subtle'
        },
        () => status.label
      )
    }
  },

  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString('es-AR')
  }
]
