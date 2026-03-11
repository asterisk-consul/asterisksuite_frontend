import type { TableColumn } from '@nuxt/ui'
import type { Location } from '~/types/logistica/master-data/locations'
import { h, ref } from 'vue'
import { UBadge, UCheckbox, UInput } from '#components'

import StatusToggle from '@/components/ui/PopoverTableActive.vue'
import '@tanstack/table-core'

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData, TValue> {
    filterType?: 'text' | 'date-range'
  }
}
type OptionValue = string | boolean

type EditableField = 'city' | 'province' | 'country' | 'postalCode'

type EditableValue = string | null | undefined
type Row = Location

const editing = ref<{ id: string; field: string } | null>(null)

const startEdit = (id: string, field: string) => (editing.value = { id, field })

const stopEdit = () => (editing.value = null)

const isEditing = (id: string, field: string) =>
  editing.value?.id === id && editing.value?.field === field

function editableCell(field: EditableField, row: Row, actions: any) {
  const id = row.id
  const originalValue = row[field]
  const value = originalValue ?? ''

  const save = () => {
    actions.onInlineSave?.(row, field, (row as any)[field])
    stopEdit()
  }

  const cancel = () => {
    ;(row as any)[field] = originalValue
    stopEdit()
  }

  if (isEditing(id, field)) {
    return h(UInput as unknown as Component, {
      modelValue: value,
      size: 'lg',
      autofocus: true,

      'onUpdate:modelValue': (v: string) => ((row as any)[field] = v),

      onBlur: save,

      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          save()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          cancel()
        }
      }
    })
  }

  return h(
    'div',
    {
      class:
        'cursor-pointer hover:bg-primary/5 hover:text-primary px-2 py-1 rounded',
      onClick: () => startEdit(id, field)
    },
    value || '—'
  )
}
export const LocationColumns = (actions: {
  onToggleActive?: (row: Row, value: boolean) => void
  onInlineSave?: (row: Row, field: EditableField, value: EditableValue) => void
  onEdit?: (row: Row) => void
}): TableColumn<Row>[] => [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value)
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value)
      })
  },
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => {
      const id = row.getValue('id') as string

      return h(
        'button',
        {
          class: 'text-primary hover:underline font-mono hover:cursor-pointer',
          onClick: () => actions.onEdit?.(row.original)
        },
        `#${id.slice(0, 8)}`
      )
    }
  },
  // {
  //   accessorKey: 'address',
  //   header: 'Dirección'
  // },
  {
    accessorKey: 'city',
    header: 'Ciudad',
    cell: ({ row }) => editableCell('city', row.original, actions)
  },
  {
    accessorKey: 'province',
    header: 'Provincia',
    cell: ({ row }) => editableCell('province', row.original, actions)
  },
  {
    accessorKey: 'country',
    header: 'País',
    cell: ({ row }) => editableCell('country', row.original, actions)
  },
  {
    accessorKey: 'postaCode',
    header: 'CP',
    cell: ({ row }) => editableCell('postalCode', row.original, actions)
  },
  {
    id: 'coordinates',
    header: 'Coordenadas',
    cell: ({ row }) => {
      const lat = row.original.latitude
      const lng = row.original.longitude
      return `${lat}, ${lng}`
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Creado',

    meta: { filterType: 'date-range' }, // ✅ coincide con tu tabla

    // 👇 filtro por rango de fechas
    filterFn: (row, columnId, value) => {
      if (!value?.start || !value?.end) return true

      const raw = row.getValue<string>(columnId)
      if (!raw) return false

      const date = new Date(raw)

      const start = new Date(value.start)
      start.setHours(0, 0, 0, 0)

      const end = new Date(value.end)
      end.setHours(23, 59, 59, 999)

      return date >= start && date <= end
    },

    // 👇 solo para render
    cell: ({ row }) => {
      const raw = row.getValue<string>('created_at')

      return new Date(raw).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    id: 'map',
    header: 'Mapa',
    cell: ({ row }) => {
      const { latitude, longitude } = row.original
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`

      return h(
        'a',
        {
          href: url,
          target: '_blank',
          class: 'text-primary underline'
        },
        'Ver mapa'
      )
    }
  }
]
