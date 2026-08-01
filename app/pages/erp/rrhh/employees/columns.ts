import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = any

type BadgeColor = 'error' | 'primary' | 'warning' | 'secondary' | 'success' | 'info' | 'neutral'

export const employeeColumns = (actions: {
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
        key: 'position',
        label: 'Cargo',
        sortable: true
      },
      {
        key: 'department',
        label: 'Departamento',
        sortable: true
      },
      {
        key: 'salary',
        label: 'Sueldo',
        sortable: true
      },
      {
        key: 'hire_date',
        label: 'Fecha Ingreso',
        sortable: true,
        date: true
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
