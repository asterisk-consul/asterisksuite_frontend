import { ref, computed, watch, type Ref } from 'vue'

/* ========================
   Tipos
======================== */
type ColumnApi = {
  id: string
  getIsVisible: () => boolean
  getCanHide: () => boolean
  toggleVisibility: (value?: boolean) => void

  columnDef?: {
    header?: unknown
    meta?: {
      label?: string
      disableColumnVisibility?: boolean
    }
  }
}

type TableApiLike = {
  getAllColumns: () => ColumnApi[]
}

type TableRefLike<TTableApi> = {
  tableApi: TTableApi | null
}

/* ========================
   Helper label
======================== */
function resolveColumnLabel(col: ColumnApi): string {
  // 1. meta.label (mejor opción)
  if (col.columnDef?.meta?.label) {
    return col.columnDef.meta.label
  }

  // 2. header string
  if (typeof col.columnDef?.header === 'string') {
    return col.columnDef.header
  }

  // 3. fallback técnico
  return col.id
}

/* ========================
   Composable
======================== */
export function useColumnVisibility<TTableApi extends TableApiLike>(
  table: Ref<TableRefLike<TTableApi> | null | undefined>,
  options?: {
    storageKey?: string | Ref<string | undefined>
  }
) {
  const columnVisibility = ref<Record<string, boolean>>({})
  const resolvedStorageKey = computed(() => {
    const key = typeof options?.storageKey === 'string' ? options.storageKey : options?.storageKey?.value
    return key ? `logistica-table:columns:${key}` : undefined
  })

  watch(
    resolvedStorageKey,
    (key) => {
      if (!import.meta.client || !key) return
      try {
        const saved = localStorage.getItem(key)
        columnVisibility.value = saved ? JSON.parse(saved) : {}
      } catch {
        columnVisibility.value = {}
      }
    },
    { immediate: true }
  )

  watch(
    columnVisibility,
    (value) => {
      const key = resolvedStorageKey.value
      if (!import.meta.client || !key) return
      localStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true }
  )

  function resetColumnVisibility() {
    columnVisibility.value = {}
    const key = resolvedStorageKey.value
    if (import.meta.client && key) localStorage.removeItem(key)
  }

  const columnVisibilityItems = computed(() => {
    void columnVisibility.value
    const api = table.value?.tableApi
    if (!api) return []

    return api
      .getAllColumns()
      .filter((col) => {
        if (['select', 'actions', 'action'].includes(col.id)) return false
        if (!col.getCanHide()) return false
        if (col.columnDef?.meta?.disableColumnVisibility) return false
        return true
      })
      .map((col) => ({
        label: resolveColumnLabel(col),
        type: 'checkbox' as const,
        checked: col.getIsVisible(),
        onUpdateChecked(checked: boolean) {
          col.toggleVisibility(!!checked)
        },
        onSelect(e?: Event) {
          e?.preventDefault()
        }
      }))
  })

  return {
    columnVisibility,
    columnVisibilityItems,
    resetColumnVisibility
  }
}
