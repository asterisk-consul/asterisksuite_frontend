import { h } from 'vue'
import { UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

import type { PartyContact } from './types/contacts.types'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

export type EditableField = 'first_name' | 'last_name' | 'role' | 'phone' | 'email'

type EditableValue = string | null | undefined

type Row = PartyContact

export const PartyContactColumns = (actions: {
  onToggleActive?: (row: Row, value: boolean) => void
  onInlineSave?: (row: Row, field: EditableField, value: EditableValue) => void
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
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
        id: 'business_party_name',

        label: 'Empresa',

        accessorFn: (row) => row.business_parties?.name ?? '—',

        cell: ({ row }) => row.original.business_parties?.name ?? '—'
      },

      {
        key: 'first_name',

        label: 'Nombre',

        sortable: true,

        editable: true,

        editField: 'first_name'
      },

      {
        key: 'last_name',

        label: 'Apellido',

        sortable: true,

        editable: true,

        editField: 'last_name'
      },

      {
        key: 'role',

        label: 'Rol',

        sortable: true,

        editable: true,

        editField: 'role'
      },

      {
        key: 'phone',

        label: 'Teléfono',

        sortable: true,

        editable: true,

        editField: 'phone'
      },

      {
        key: 'email',

        label: 'Email',

        sortable: true,

        editable: true,

        editField: 'email'
      },

      {
        id: 'full_name',

        label: 'Nombre completo',

        accessorFn: (row) => `${row.first_name} ${row.last_name}`,

        cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`
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
