import type { TableColumn } from '@nuxt/ui'

import type { TransferRate } from '~/modulos/logistica/transport/transfer-rates/transfer-rates.types'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'
import { useSelectColumn } from '@/composables/table/useSelectColumn'

import StatusToggle from '@/components/ui/PopoverTableActive.vue'

export type EditableField = 'name' | 'rate_type' | 'description'

type EditableValue = string | null | undefined

type Row = TransferRate

export const tarifasColumns = (actions: {
  onToggleActive?: (row: Row, value: boolean) => void
  onInlineSave?: (row: Row, field: EditableField, value: EditableValue) => void
  onEdit?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row, EditableField>({
    locale: 'es-AR',
    onInlineSave: actions.onInlineSave,
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),

    useIdColumn(actions.onEdit),

    ...build([
      {
        key: 'name',

        label: 'Nombre',

        sortable: true,

        editable: true,

        editField: 'name'
      },

      {
        key: 'rate_type',

        label: 'Tipo',

        sortable: true,

        editable: true,

        editField: 'rate_type'
      },

      {
        key: 'description',

        label: 'Descripción',

        sortable: true,

        editable: true,

        editField: 'description'
      },

      {
        key: 'active',

        label: 'Estado',

        enum: {
          options: [
            {
              label: 'Activo',
              value: true,
              color: 'success'
            },
            {
              label: 'Inactivo',
              value: false,
              color: 'error'
            }
          ],

          toggle: {
            component: StatusToggle,

            title: 'Cambiar estado',

            onChange: (row, value) => actions.onToggleActive?.(row, value as boolean)
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
