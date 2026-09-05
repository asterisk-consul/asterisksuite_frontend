import { createTableBuilder, type BadgeColor } from '~/composables/table/createColumns'
import { useSelectColumn } from '~/composables/table/useSelectColumn'
import { useIdColumn } from '~/composables/table/useIdColumn'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { Tire } from '~/modulos/logistica/maintenance/types/maintenance.types'

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  IN_STOCK: { color: 'info', label: 'En Stock' },
  INSTALLED: { color: 'success', label: 'Instalada' },
  IN_REPAIR: { color: 'warning', label: 'En Reparo' },
  SCRAPPED: { color: 'error', label: 'Dada de Baja' },
  SOLD: { color: 'neutral', label: 'Vendida' }
}

export const tireColumns = (actions: {
  onEdit?: (row: Tire) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<Tire>[] => {
  const build = createTableBuilder<Tire>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onEdit),
    ...build([
      { key: 'serial_number', label: 'Serial', sortable: true },
      {
        id: 'product',
        accessorFn: (row) => row.product?.name ?? '—',
        label: 'Producto'
      },
      {
        key: 'status',
        label: 'Estado',
        badge: {
          resolve: (row) => statusConfig[row.status] ?? { color: 'neutral', label: row.status }
        }
      },
      {
        id: 'current_vehicle',
        accessorFn: (row) => row.current_vehicle?.plate ?? '—',
        label: 'Vehículo Actual'
      },
      {
        key: 'accumulated_km',
        label: 'Km Acumulados',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.accumulated_km
          if (!value) return '—'
          return `${Number(value).toLocaleString('es-AR')} km`
        }
      },
      { key: 'days_in_use', label: 'Días en Uso', sortable: true },
      { key: 'installation_count', label: 'Instalaciones' },
      { key: 'created_at', label: 'Fecha Alta', date: true, sortable: true }
    ])
  ]
}
