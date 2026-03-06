import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

export interface TripRate {
  id: string
  value: string
  transfer_rates: {
    name: string
    rate_type: string
  }
}

export interface VehicleCombination {
  id: string
  unit_number?: string | null
}

export interface Trip {
  id: string
  reference_number: string
  departure_time: string
  arrival_time: string
  status: string
  kilometers?: string
  vehicle_combination?: VehicleCombination
  trip_rates?: TripRate[]
  created_at: string
}

function formatDate(date?: string) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PLANNED':
      return 'info'
    case 'IN_PROGRESS':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    default:
      return 'neutral'
  }
}
function getStatusLabel(status: string) {
  switch (status) {
    case 'PLANNED':
      return 'Planificado'
    case 'IN_PROGRESS':
      return 'En curso'
    case 'COMPLETED':
      return 'Completado'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return status
  }
}

export const columns: TableColumn<Trip>[] = [
  {
    accessorKey: 'reference_number',
    header: 'Referencia'
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) =>
      h(
        UBadge,
        { variant: 'subtle', color: getStatusColor(row.original.status) },
        () => getStatusLabel(row.original.status) // ✅ antes era row.original.status directo
      )
  },
  {
    id: 'vehicle_combination',
    header: 'Combinación',
    cell: ({ row }) => {
      const vc = row.original.vehicle_combination
      if (!vc) return '—'

      // Mostrá unit_number si existe, sino un ID corto como fallback
      return vc.unit_number || `VC-${vc.id.slice(0, 8)}`
    }
  },
  {
    accessorKey: 'kilometers',
    header: 'Km',
    cell: ({ row }) => row.original.kilometers || '—'
  },
  {
    id: 'trip_rates',
    header: 'Tarifas',
    cell: ({ row }) => {
      const rates = row.original.trip_rates
      if (!rates?.length) return '—'

      return h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        rates.map((r) =>
          h(
            UBadge,
            {
              variant: 'subtle',
              color:
                r.transfer_rates.rate_type === 'CLIENT' ? 'info' : 'success'
            },
            () => `${r.transfer_rates.name}: $${r.value}`
          )
        )
      )
    }
  },
  {
    accessorKey: 'departure_time',
    header: 'Salida',
    cell: ({ row }) => formatDate(row.original.departure_time)
  },
  {
    accessorKey: 'arrival_time',
    header: 'Llegada',
    cell: ({ row }) => formatDate(row.original.arrival_time)
  },
  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => formatDate(row.original.created_at)
  }
]
