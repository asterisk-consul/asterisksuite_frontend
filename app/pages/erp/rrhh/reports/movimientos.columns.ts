import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'

type Row = any

export const movimientoColumns = (actions: {
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
        key: 'date',
        label: 'Fecha',
        sortable: true,
        date: true
      },
      {
        key: 'type',
        label: 'Tipo',
        badge: {
          resolve: (row) => ({
            label: ENTRY_TYPE_CONFIG[row.type]?.label ?? row.type,
            color: (ENTRY_TYPE_CONFIG[row.type]?.side === 'credit' ? 'success' : 'error') as any
          })
        }
      },
      {
        key: 'description',
        label: 'Descripción'
      },
      {
        key: 'amount',
        label: 'Monto',
        sortable: true
      },
      {
        key: 'balance_after',
        label: 'Saldo',
        sortable: true
      }
    ])
  ]
}
