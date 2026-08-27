import { h } from 'vue'

import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

import type { Driver } from '~/modulos/logistica/transport/drivers/drivers.types'

import StatusToggle from '@/components/ui/PopoverTableActive.vue'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type OptionValue = string | boolean

type Row = Driver

function getDocumentColor(expiration?: string | null) {
  if (!expiration) return 'neutral'

  const today = new Date()
  const exp = new Date(expiration)

  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return 'error'
  if (diff < 30) return 'warning'

  return 'success'
}

export const driversColumns = (actions: {
  onToggleActive?: (row: Row, value: boolean) => void

  onEdit?: (row: Row) => void

  onDelete?: (row: Row) => void

  onSortFieldSelect?: (columnId: string) => void
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
        id: 'driver',

        label: 'Chofer',

        sortable: true,

        accessorFn: (row) => `${row.first_name} ${row.last_name}`,

        cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`
      },

      {
        key: 'document',

        label: 'Documento',

        sortable: true
      },

      {
        key: 'phone',

        label: 'Teléfono',

        sortable: true,

        cell: ({ row }) => row.original.phone ?? '—'
      },

      {
        id: 'documents',

        label: 'Documentos',

        cell: ({ row }) => {
          const docs = row.original.driverDocuments

          if (!docs?.length) {
            return '—'
          }

          return h(
            'div',
            {
              class: 'flex flex-wrap gap-1'
            },
            docs.map((doc) =>
              h(
                UBadge,
                {
                  variant: 'subtle',
                  color: getDocumentColor(doc.expiration_date)
                },
                () => doc.transport_document_types?.name ?? 'Documento'
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
      },

      {
        id: 'actions',
        label: '',
        cell: ({ row }) => h('div', { class: 'flex gap-1' }, [
          h(UButton, {
            icon: 'i-lucide-pencil',
            size: 'xs',
            variant: 'ghost',
            color: 'neutral',
            onClick: () => actions.onEdit?.(row.original)
          }),
          actions.onDelete
            ? h(UButton, {
                icon: 'i-lucide-trash-2',
                size: 'xs',
                variant: 'ghost',
                color: 'error',
                onClick: () => actions.onDelete?.(row.original)
              })
            : null
        ])
      }
    ])
  ]
}
