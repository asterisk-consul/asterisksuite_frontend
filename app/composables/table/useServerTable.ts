import type { TableFilter } from '~/components/Tablas/types/tablas.types'

type SortingState = { id: string; desc: boolean }[]
type ServerTableState = {
  page: number
  pageSize: number
  search: string
  sorting: SortingState
  filters: TableFilter[]
}

export function useServerTable(load: (query: {
  page: number
  pageSize: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}) => Promise<unknown>, stateKey?: string) {
  const savedState = stateKey
    ? useState<ServerTableState>('server-table:' + stateKey, () => ({
        page: 1,
        pageSize: 25,
        search: '',
        sorting: [],
        filters: []
      }))
    : undefined
  const page = ref(savedState?.value.page ?? 1)
  const pageSize = ref(savedState?.value.pageSize ?? 25)
  const search = ref(savedState?.value.search ?? '')
  const debouncedSearch = ref(search.value.trim())
  const sorting = ref<SortingState>(savedState?.value.sorting ?? [])
  const filters = ref<TableFilter[]>(savedState?.value.filters ?? [])
  const debouncedFilters = ref<TableFilter[]>(filters.value.map(filter => ({ ...filter })))
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

  watch([page, pageSize, search, sorting, filters], () => {
    if (!savedState) return
    savedState.value = {
      page: page.value,
      pageSize: pageSize.value,
      search: search.value,
      sorting: sorting.value.map(item => ({ ...item })),
      filters: filters.value.map(filter => ({
        ...filter,
        value: filter.value && typeof filter.value === 'object' ? { ...filter.value } : filter.value
      }))
    }
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
