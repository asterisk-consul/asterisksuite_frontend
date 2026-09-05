import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = any

export const saldoColumns = (actions: {
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
        key: 'party_name',
        label: 'Persona',
        sortable: true
      },
      {
        key: 'party_type',
        label: 'Tipo',
        badge: {
          resolve: (row) => ({
            label: row.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio',
            color: (row.party_type === 'EMPLOYEE' ? 'info' : 'warning') as any
          })
        }
      },
      {
        key: 'currency_code',
        label: 'Moneda'
      },
      {
        key: 'balance',
        label: 'Saldo',
        sortable: true
      }
    ])
  ]
}
