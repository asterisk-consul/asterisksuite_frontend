import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'
import type { BadgeColor } from '@/composables/table/createColumns'

type Row = any

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  PLANNED: { label: 'Planificada', color: 'neutral' },
  IN_PREPARATION: { label: 'En Preparación', color: 'info' },
  SHIPPED: { label: 'Embarcada', color: 'info' },
  IN_TRANSIT: { label: 'En Tránsito', color: 'warning' },
  ARRIVED: { label: 'Arribada', color: 'warning' },
  CUSTOMS: { label: 'Aduana', color: 'primary' },
  RELEASED: { label: 'Liberada', color: 'success' },
  DELIVERED: { label: 'Entregada', color: 'success' },
  CLOSED: { label: 'Cerrada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'error' }
}

const statusOptions = [
  { label: 'Planificada', value: 'PLANNED' },
  { label: 'En Preparación', value: 'IN_PREPARATION' },
  { label: 'Embarcada', value: 'SHIPPED' },
  { label: 'En Tránsito', value: 'IN_TRANSIT' },
  { label: 'Arribada', value: 'ARRIVED' },
  { label: 'Aduana', value: 'CUSTOMS' },
  { label: 'Liberada', value: 'RELEASED' },
  { label: 'Entregada', value: 'DELIVERED' },
  { label: 'Cerrada', value: 'CLOSED' },
  { label: 'Cancelada', value: 'CANCELLED' }
]

export const operationColumns = (actions: {
  onOpen?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onOpen),
    ...build([
      {
        key: 'number',
        label: 'Operación',
        sortable: true
      },
      {
        key: 'name',
        label: 'Nombre'
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => statusConfig[row.status] ?? { label: row.status, color: 'neutral' }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: statusOptions
          }
        }
      },
      {
        key: 'primary_supplier',
        label: 'Proveedor',
        accessorFn: (row) => row.primary_supplier?.name ?? '-'
      },
      {
        key: 'origin_country',
        label: 'Origen'
      },
      {
        key: 'destination_country',
        label: 'Destino'
      },
      {
        key: 'estimated_arrival_date',
        label: 'ETA',
        sortable: true,
        date: true
      },
      {
        key: 'containers',
        label: 'Contenedores',
        accessorFn: (row) => row.containers?.length ?? 0
      }
    ])
  ]
}
