import { h } from 'vue'
import { UCheckbox } from '#components'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'

export function useSelectColumn<T>(): ExtendedColumn<T> {
  return {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: unknown) =>
          table.toggleAllPageRowsSelected(!!value)
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: unknown) => row.toggleSelected(!!value)
      }),
    meta: {
      disableColumnVisibility: true
    }
  }
}
