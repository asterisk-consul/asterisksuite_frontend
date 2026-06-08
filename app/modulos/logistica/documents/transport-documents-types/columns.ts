import type { TableColumn } from '@nuxt/ui'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

import StatusToggle from '@/components/ui/PopoverTableActive.vue'

import type {
  DocumentType,
  DocumentEntity
} from '~/modulos/logistica/documents/transport-documents-types/document-types.types'

type Row = DocumentType

const entityConfig = {
  VEHICLE: {
    label: 'Vehículo',
    color: 'primary'
  },
  DRIVER: {
    label: 'Chofer',
    color: 'warning'
  }
} as const

export type EditableField = 'name'

export const transportDocumentTypeColumns = (actions: {
  onToggleActive?: (row: Row, value: boolean) => void
  onToggleEntity?: (row: Row, value: DocumentEntity) => void
  onInlineSave?: (row: Row, field: any, value: string) => void
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
        key: 'entity',

        label: 'Entidad',

        sortable: true,

        enum: {
          options: [
            {
              label: 'Vehículo',
              value: 'VEHICLE',
              color: 'primary'
            },
            {
              label: 'Chofer',
              value: 'DRIVER',
              color: 'warning'
            }
          ],

          toggle: {
            component: StatusToggle,

            title: 'Cambiar entidad',

            onChange: (row, value) => actions.onToggleEntity?.(row, value as DocumentEntity)
          }
        }
      },

      {
        key: 'active',

        label: 'Estado',

        sortable: true,

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
