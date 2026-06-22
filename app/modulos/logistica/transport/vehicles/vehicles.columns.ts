import { h } from 'vue'

import type { TableColumn } from '@nuxt/ui'

import type { Vehicle } from '~/modulos/logistica/transport/vehicles/types/vehicles.types'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

import StatusToggle from '@/components/ui/PopoverTableActive.vue'
import { UBadge } from '#components'

type OptionValue = string | boolean

export type EditableField = 'plate'

type Row = Vehicle

type EditableValue = string | null | undefined

function getDocumentColor(expiration: string) {
  const today = new Date()
  const exp = new Date(expiration)

  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return 'error'
  if (diff < 30) return 'warning'

  return 'success'
}

export const vehiclesColumns = (actions: {
  onInlineSave?: (row: Row, field: EditableField, value: EditableValue) => void
  onToggleActive?: (row: Row, value: boolean) => void
  onToggleRefrigeration?: (row: Row, value: boolean) => void
  onToggleType?: (row: Row, value: 'CAMION' | 'SEMI') => void
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
        key: 'plate',

        label: 'Patente',

        sortable: true,

        editable: true,

        editField: 'plate'
      },

      {
        key: 'type',

        label: 'Tipo',

        sortable: true,

        enum: {
          options: [
            {
              label: 'Camión',
              value: 'CAMION',
              color: 'primary'
            },
            {
              label: 'Semi',
              value: 'SEMI',
              color: 'warning'
            }
          ],

          toggle: {
            component: StatusToggle,

            title: 'Cambiar tipo de vehículo',

            onChange: (row, value) => actions.onToggleType?.(row, value as 'CAMION' | 'SEMI')
          }
        }
      },

      {
        id: 'vehicle',

        label: 'Vehículo',

        sortable: true,

        accessorFn: (row) => `${row.brand ?? ''} ${row.model ?? ''}`.trim() || '—',

        cell: ({ row }) => `${row.original.brand ?? ''} ${row.original.model ?? ''}`.trim() || '—'
      },

      {
        key: 'refrigeration',

        label: 'Refrigeración',

        sortable: true,

        enum: {
          options: [
            {
              label: 'Refrigerado',
              value: true,
              color: 'info'
            },
            {
              label: 'Normal',
              value: false,
              color: 'neutral'
            }
          ],

          toggle: {
            component: StatusToggle,

            title: 'Cambiar tipo de refrigeración',

            onChange: (row, value) => actions.onToggleRefrigeration?.(row, value as boolean)
          }
        }
      },

      {
        id: 'documents',

        label: 'Documentos',

        cell: ({ row }) => {
          const docs = row.original.vehicleDocuments

          if (!docs?.length) {
            return '—'
          }

          return h(
            'div',
            { class: 'flex flex-wrap gap-1' },
            docs.map((doc) =>
              h(
                UBadge,
                {
                  variant: 'subtle',
                  color: getDocumentColor(doc.expiration_date)
                },
                () => doc.transport_document_types.name
              )
            )
          )
        }
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
