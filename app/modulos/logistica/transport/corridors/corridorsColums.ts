import { h } from 'vue'

import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

import type { Corridor } from './types/corridors.types'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Corridor

export const corridorsColumns = (actions: {
  onEdit?: (row: Row) => void
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
        key: 'name',

        label: 'Corredor',

        sortable: true
      },

      {
        id: 'route',

        label: 'Ruta',

        sortable: true,

        accessorFn: (row) => `${row.origin_location?.city ?? ''} ${row.destination_location?.city ?? ''}`,

        cell: ({ row }) => {
          const c = row.original

          return h(
            'div',
            {
              class: 'flex items-center gap-2 text-sm'
            },
            [
              h(
                'span',
                {
                  class: 'font-medium'
                },
                c.origin_location?.city ?? 'Origen'
              ),

              h(
                'span',
                {
                  class: 'text-gray-400'
                },
                '→'
              ),

              h(
                'span',
                {
                  class: 'font-medium'
                },
                c.destination_location?.city ?? 'Destino'
              )
            ]
          )
        }
      },

      {
        id: 'stops',

        label: 'Paradas',

        sortable: true,

        accessorFn: (row) => row.corridorStops?.length ?? 0,

        cell: ({ row }) => row.original.corridorStops?.length ?? 0
      },

      {
        id: 'distance',

        label: 'Distancia',

        sortable: true,

        accessorFn: (row) => row.total_distance_km ?? 0,

        cell: ({ row }) => (row.original.total_distance_km ? `${row.original.total_distance_km} km` : '—')
      },

      {
        id: 'time',

        label: 'Tiempo',

        sortable: true,

        accessorFn: (row) => row.estimated_minutes ?? 0,

        cell: ({ row }) => (row.original.estimated_minutes ? `${row.original.estimated_minutes} min` : '—')
      },

      {
        key: 'is_template',

        label: 'Tipo',

        enum: {
          options: [
            {
              label: 'Template',
              value: true,
              color: 'info'
            },
            {
              label: 'Corredor',
              value: false,
              color: 'neutral'
            }
          ]
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
