import type { TableColumn } from '@nuxt/ui'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'
import { useSelectColumn } from '@/composables/table/useSelectColumn'

import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

type Row = BusinessParty

export const BusinessPartyColumns = (actions: {
  onSortFieldSelect?: (columnId: string) => void
  onEdit?: (row: Row) => void
}): TableColumn<Row>[] => {
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
        key: 'tax_id',
        label: 'CUIT',
        sortable: true
      },

      {
        key: 'type',
        label: 'Tipo',
        sortable: true,

        badge: {
          resolve: (row) => ({
            label: row.type === 'client' ? 'Cliente' : 'Proveedor',
            color: row.type === 'client' ? 'primary' : 'warning'
          })
        },

        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              {
                label: 'Cliente',
                value: 'client'
              },
              {
                label: 'Proveedor',
                value: 'supplier'
              }
            ]
          }
        }
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
              {
                label: 'Activo',
                value: true
              },
              {
                label: 'Inactivo',
                value: false
              }
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
