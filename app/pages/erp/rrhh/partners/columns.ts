import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = any

export const partnerColumns = (actions: {
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
        key: 'first_name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'last_name',
        label: 'Apellido',
        sortable: true
      },
      {
        key: 'document_type',
        label: 'Doc. Tipo',
        sortable: true
      },
      {
        key: 'document_number',
        label: 'Documento',
        sortable: true
      },
      {
        key: 'share_percentage',
        label: '% Participación',
        sortable: true
      },
      {
        key: 'capital_contributed',
        label: 'Capital',
        sortable: true
      },
      {
        key: 'is_active',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => ({
            label: row.is_active ? 'Activo' : 'Inactivo',
            color: row.is_active ? 'success' : 'error'
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Activo', value: true },
              { label: 'Inactivo', value: false }
            ]
          }
        }
      },
      {
        key: 'created_at',
        label: 'Creado',
        sortable: true,
        date: true
      }
    ])
  ]
}
