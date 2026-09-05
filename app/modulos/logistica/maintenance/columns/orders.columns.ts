import { h } from 'vue'
import { createTableBuilder, type BadgeColor } from '~/composables/table/createColumns'
import { useSelectColumn } from '~/composables/table/useSelectColumn'
import { useIdColumn } from '~/composables/table/useIdColumn'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { MaintenanceOrder } from '~/modulos/logistica/maintenance/types/maintenance.types'

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  PENDING: { color: 'warning', label: 'Pendiente' },
  SCHEDULED: { color: 'info', label: 'Programada' },
  IN_PROGRESS: { color: 'primary', label: 'En Progreso' },
  WAITING_PARTS: { color: 'secondary', label: 'Esperando Repuestos' },
  WAITING_SUPPLIER: { color: 'secondary', label: 'Esperando Proveedor' },
  COMPLETED: { color: 'success', label: 'Completada' },
  CANCELLED: { color: 'error', label: 'Cancelada' }
}

const priorityConfig: Record<string, { color: BadgeColor; label: string }> = {
  CRITICAL: { color: 'error', label: 'Crítica' },
  HIGH: { color: 'warning', label: 'Alta' },
  MEDIUM: { color: 'info', label: 'Media' },
  LOW: { color: 'neutral', label: 'Baja' }
}

export const orderColumns = (actions: {
  onEdit?: (row: MaintenanceOrder) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<MaintenanceOrder>[] => {
  const build = createTableBuilder<MaintenanceOrder>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onEdit),
    ...build([
      { key: 'number', label: 'Número', sortable: true },
      { key: 'title', label: 'Título', sortable: true },
      {
        id: 'vehicle',
        accessorFn: (row) => row.vehicle?.plate ?? '—',
        label: 'Vehículo'
      },
      {
        key: 'status',
        label: 'Estado',
        badge: {
          resolve: (row) => statusConfig[row.status] ?? { color: 'neutral', label: row.status }
        }
      },
      {
        key: 'priority',
        label: 'Prioridad',
        badge: {
          resolve: (row) => priorityConfig[row.priority] ?? { color: 'neutral', label: row.priority }
        }
      },
      { key: 'category', label: 'Categoría' },
      { key: 'scheduled_at', label: 'Programada', date: true, sortable: true },
      {
        key: 'actual_cost',
        label: 'Costo',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.actual_cost
          if (!value) return '—'
          return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
        }
      }
    ])
  ]
}
