import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'
import { HR_VALE_TYPE_LABELS, HR_VALE_TYPE_COLORS, HR_VALE_STATUS_LABELS, HR_VALE_STATUS_COLORS } from '~/modulos/erp/hr/types/hr.types'

type Row = any

export const valePeriodoColumns = (actions: {
  onEdit?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onEdit),

    ...build([
      {
        key: 'number',
        label: 'Nº',
        sortable: true
      },
      {
        key: 'party_name',
        label: 'Persona',
        sortable: true,
        accessorFn: (row) => row.party?.name ?? '-'
      },
      {
        key: 'type',
        label: 'Tipo',
        badge: {
          resolve: (row) => ({
            label: HR_VALE_TYPE_LABELS[row.type as keyof typeof HR_VALE_TYPE_LABELS] ?? row.type,
            color: (HR_VALE_TYPE_COLORS[row.type as keyof typeof HR_VALE_TYPE_COLORS] ?? 'neutral') as any
          })
        }
      },
      {
        key: 'amount',
        label: 'Monto',
        sortable: true
      },
      {
        key: 'date',
        label: 'Fecha',
        sortable: true,
        date: true
      },
      {
        key: 'status',
        label: 'Estado',
        badge: {
          resolve: (row) => ({
            label: HR_VALE_STATUS_LABELS[row.status as keyof typeof HR_VALE_STATUS_LABELS] ?? row.status,
            color: (HR_VALE_STATUS_COLORS[row.status as keyof typeof HR_VALE_STATUS_COLORS] ?? 'neutral') as any
          })
        }
      },
      {
        key: 'created_by_name',
        label: 'Creado por',
        accessorFn: (row) => row.created_by_name ?? '-'
      }
    ])
  ]
}
