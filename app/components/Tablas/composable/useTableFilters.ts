import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'

import type {
  TableFilter,
  FilterOperator
} from '~/components/Tablas/types/tablas.types'

let filterSequence = 0
const nextFilterId = () => `${Date.now()}-${++filterSequence}`

export function useTableFilters(
  table: Ref<any>,
  columns?: Ref<any[]>,
  options: { filters?: Ref<TableFilter[]>; applyLocally?: boolean } = {}
) {
  const filters = options.filters ?? ref<TableFilter[]>([])

  function getColumnMeta(columnId: string) {
    return columns?.value?.find(
      (c) => c.accessorKey === columnId || c.id === columnId
    )?.meta?.filter
  }

  function getDefaultOperator(type?: string): FilterOperator {
    switch (type) {
      case 'number':
        return 'equals'

      case 'date-range':
        return 'between'

      case 'select':
        return 'equals'

      default:
        return 'contains'
    }
  }

  function getDefaultValue(type?: string) {
    switch (type) {
      case 'date-range':
        return {
          start: undefined,
          end: undefined
        }

      case 'boolean':
        return false

      default:
        return ''
    }
  }

  function addFilter() {
    const firstColumn = columns?.value?.find((c) => (c.accessorKey || c.id) && c.meta?.filter)

    const columnId = firstColumn?.accessorKey || firstColumn?.id || ''

    const meta = getColumnMeta(columnId)

    filters.value.push({
      id: nextFilterId(),
      column: columnId,
      operator: getDefaultOperator(meta?.type),
      value: getDefaultValue(meta?.type)
    })
  }

  function removeFilter(id: string) {
    filters.value = filters.value.filter((f) => f.id !== id)
  }

  function clearFilters() {
    filters.value = []

    const api = table.value?.tableApi

    if (!api) return

    api.resetColumnFilters()
  }

  watch(
    filters,
    () => {
      if (options.applyLocally === false) return
      const api = table.value?.tableApi

      if (!api) return

      api.resetColumnFilters()

      filters.value.forEach((filter) => {
        if (!filter.column) return

        api.getColumn(filter.column)?.setFilterValue({
          operator: filter.operator,
          value: filter.value
        })
      })
    },
    {
      deep: true
    }
  )

  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters
  }
}
