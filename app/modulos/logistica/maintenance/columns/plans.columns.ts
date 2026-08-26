import { createTableBuilder, type BadgeColor } from '~/composables/table/createColumns'
import { useSelectColumn } from '~/composables/table/useSelectColumn'
import { useIdColumn } from '~/composables/table/useIdColumn'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { MaintenancePlan } from '~/modulos/logistica/maintenance/types/maintenance.types'

const intervalConfig: Record<string, string> = {
  INTERVAL_KM: 'Por Km',
  INTERVAL_DAYS: 'Por Días',
  INTERVAL_MONTHS: 'Por Meses',
  FIXED_DATE: 'Fecha Fija'
}

const priorityConfig: Record<string, { color: BadgeColor; label: string }> = {
  CRITICAL: { color: 'error', label: 'Crítica' },
  HIGH: { color: 'warning', label: 'Alta' },
  MEDIUM: { color: 'info', label: 'Media' },
  LOW: { color: 'neutral', label: 'Baja' }
}

export const planColumns = (actions: {
  onEdit?: (row: MaintenancePlan) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<MaintenancePlan>[] => {
  const build = createTableBuilder<MaintenancePlan>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onEdit),
    ...build([
      { key: 'name', label: 'Nombre', sortable: true },
      { key: 'asset_type', label: 'Tipo Activo' },
      { key: 'category', label: 'Categoría' },
      {
        key: 'interval_type',
        label: 'Intervalo',
        cell: ({ row }) => intervalConfig[row.original.interval_type] ?? row.original.interval_type
      },
      {
        key: 'priority',
        label: 'Prioridad',
        badge: {
          resolve: (row) => priorityConfig[row.priority] ?? { color: 'neutral', label: row.priority }
        }
      },
      {
        key: 'estimated_cost',
        label: 'Costo Est.',
        cell: ({ row }) => {
          const value = row.original.estimated_cost
          if (!value) return '—'
          return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
        }
      },
      {
        key: 'active',
        label: 'Activo',
        badge: {
          resolve: (row) => ({
            color: row.active ? 'success' : 'error',
            label: row.active ? 'Activo' : 'Inactivo'
          })
        }
      }
    ])
  ]
}
