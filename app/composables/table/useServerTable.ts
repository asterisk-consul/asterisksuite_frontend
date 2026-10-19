import type { TableFilter } from '~/components/Tablas/types/tablas.types'

type SortingState = { id: string; desc: boolean }[]

export function useServerTable(load: (query: {
  page: number
  pageSize: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}) => Promise<unknown>) {
  const page = ref(1)
  const pageSize = ref(25)
  const search = ref('')
  const debouncedSearch = ref('')
  const sorting = ref<SortingState>([])
  const filters = ref<TableFilter[]>([])
  const debouncedFilters = ref<TableFilter[]>([])
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let filterTimer: ReturnType<typeof setTimeout> | undefined

  watch(search, (value) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      debouncedSearch.value = value.trim()
    }, 350)
  })

  watch(filters, (value) => {
    clearTimeout(filterTimer)
    filterTimer = setTimeout(() => {
      page.value = 1
      debouncedFilters.value = value.map(({ id, column, operator, value: filterValue }) => ({
        id,
        column,
        operator,
        value: filterValue && typeof filterValue === 'object' ? { ...filterValue } : filterValue
      }))
    }, 350)
  }, { deep: true })

  const query = computed(() => {
    const currentSort = sorting.value[0]
    return {
      page: page.value,
      pageSize: pageSize.value,
      search: debouncedSearch.value || undefined,
      sort: currentSort?.id,
      order: currentSort ? (currentSort.desc ? 'desc' as const : 'asc' as const) : undefined,
      filters: debouncedFilters.value.length
        ? JSON.stringify(debouncedFilters.value.map(({ column, operator, value }) => ({ column, operator, value })))
        : undefined
    }
  })

  const refresh = () => load(query.value)
  watch(query, refresh, { immediate: true })
  onScopeDispose(() => {
    clearTimeout(searchTimer)
    clearTimeout(filterTimer)
  })

  return { page, pageSize, search, sorting, filters, refresh }
}
