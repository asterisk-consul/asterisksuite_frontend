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
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  watch(search, (value) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      debouncedSearch.value = value.trim()
    }, 350)
  })

  const query = computed(() => {
    const currentSort = sorting.value[0]
    return {
      page: page.value,
      pageSize: pageSize.value,
      search: debouncedSearch.value || undefined,
      sort: currentSort?.id,
      order: currentSort ? (currentSort.desc ? 'desc' as const : 'asc' as const) : undefined
    }
  })

  const refresh = () => load(query.value)
  watch(query, refresh, { immediate: true })
  onScopeDispose(() => clearTimeout(searchTimer))

  return { page, pageSize, search, sorting, refresh }
}
