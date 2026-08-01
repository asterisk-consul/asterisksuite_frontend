import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = any

type BadgeColor = 'error' | 'primary' | 'warning' | 'secondary' | 'success' | 'info' | 'neutral'

const ivaConfig: Record<string, { label: string; color: BadgeColor }> = {
  RESPONSABLE_INSCRIPTO: { label: 'RI', color: 'info' },
  MONOTRIBUTO: { label: 'Mono', color: 'warning' },
  CONSUMIDOR_FINAL: { label: 'CF', color: 'neutral' },
  EXENTO: { label: 'Exento', color: 'success' }
}

export const supplierColumns = (actions: {
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
        key: 'name',
        label: 'Razón Social',
        sortable: true
      },
      {
        key: 'business_names',
        label: 'Nombre Fantasía',
        sortable: true
      },
      {
        key: 'document_type',
        label: 'Doc. Tipo',
        sortable: true
      },
      {
        key: 'tax_id',
        label: 'CUIT',
        sortable: true
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true
      },
      {
        key: 'vat_condition',
        label: 'IVA',
        badge: {
          resolve: (row) => ivaConfig[row.vat_condition] ?? { label: row.vat_condition ?? '—', color: 'neutral' }
        }
      },
      {
        key: 'exemption_rate',
        label: 'Exención',
        sortable: true
      },
      {
        key: 'active',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => ({
            label: row.active ? 'Activo' : 'Inactivo',
            color: row.active ? 'success' : 'error'
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
