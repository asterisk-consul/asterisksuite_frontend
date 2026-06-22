import type { TableColumn } from '@nuxt/ui'

import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Location

export type EditableField = 'city' | 'province' | 'country' | 'postalCode' | 'address'

type EditableValue = string | null | undefined

export const LocationColumns = (actions: {
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
        key: 'address',
        label: 'Dirección',
        sortable: true,
        editable: true,
        editField: 'address'
      },

      {
        key: 'city',
        label: 'Ciudad',
        sortable: true,
        editable: true,
        editField: 'city'
      },

      {
        key: 'province',
        label: 'Provincia',
        sortable: true,
        editable: true,
        editField: 'province'
      },

      {
        key: 'country',
        label: 'País',
        sortable: true,
        editable: true,
        editField: 'country'
      },

      {
        key: 'postalCode',
        label: 'CP',
        sortable: true,
        editable: true,
        editField: 'postalCode'
      },

      {
        id: 'coordinates',

        label: 'Coordenadas',

        accessorFn: (row) => `${row.latitude ?? ''}, ${row.longitude ?? ''}`,

        cell: ({ row }) => `${row.original.latitude}, ${row.original.longitude}`
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
