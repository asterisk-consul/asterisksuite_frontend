import { ref, computed, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { tablePreferencesService } from '~/modulos/user-preferences/table-preferences.service'

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
   Helpers
======================== */
function resolveColumnLabel(col: ColumnApi): string {
  if (col.columnDef?.meta?.label) return col.columnDef.meta.label
  if (typeof col.columnDef?.header === 'string') return col.columnDef.header
  return col.id
}

function parseOrder(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length <= 200))]
    : []
}

function parseVisibility(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, visible]) => id.length <= 200 && typeof visible === 'boolean')
      .slice(0, 250)
  )
}

function resolveOptionKey(value?: string | Ref<string | undefined>): string | undefined {
  return typeof value === 'string' ? value : value?.value
}

/* ========================
   Composable
======================== */
export function useColumnVisibility<TTableApi extends TableApiLike>(
  table: Ref<TableRefLike<TTableApi> | null | undefined>,
  options?: {
    storageKey?: string | Ref<string | undefined>
    preferenceKey?: string | Ref<string | undefined>
  }
) {
  const columnVisibility = ref<Record<string, boolean>>({})
  const columnOrder = ref<string[]>([])
  const resolvedStorageIdentity = computed(() => resolveOptionKey(options?.storageKey))
  const resolvedPreferenceKey = computed(() => resolveOptionKey(options?.preferenceKey))
  const resolvedStorageKey = computed(() => {
    const key = resolvedStorageIdentity.value
    return key ? `logistica-table:columns:${key}` : undefined
  })
  const resolvedOrderStorageKey = computed(() => {
    const key = resolvedStorageIdentity.value
    return key ? `logistica-table:column-order:${key}` : undefined
  })
  const resolvedSyncIdentity = computed(() =>
    `${resolvedPreferenceKey.value ?? ''}::${resolvedStorageIdentity.value ?? ''}`
  )

  let isHydrating = false
  let hasMounted = false
  let loadingIdentity: string | undefined
  let readyPreferenceKey: string | undefined
  let localChangedDuringLoad = false
  let loadRequestId = 0
  let remoteSaveTimer: ReturnType<typeof setTimeout> | undefined
  let remoteSaveChain: Promise<void> = Promise.resolve()

  function readLocalPreferences() {
    let savedVisibility: Record<string, boolean> = {}
    let savedOrder: string[] = []
    let hasLocalPreference = false

    try {
      const visibilityKey = resolvedStorageKey.value
      const orderKey = resolvedOrderStorageKey.value
      const rawVisibility = visibilityKey ? localStorage.getItem(visibilityKey) : null
      const rawOrder = orderKey ? localStorage.getItem(orderKey) : null
      hasLocalPreference = rawVisibility !== null || rawOrder !== null
      if (rawVisibility) savedVisibility = parseVisibility(JSON.parse(rawVisibility))
      if (rawOrder) savedOrder = parseOrder(JSON.parse(rawOrder))
    } catch {
      // Las preferencias locales son solo un respaldo; una entrada dañada no bloquea la tabla.
    }

    return { savedVisibility, savedOrder, hasLocalPreference }
  }

  function persistLocalPreferences() {
    const visibilityKey = resolvedStorageKey.value
    const orderKey = resolvedOrderStorageKey.value
    if (!import.meta.client || (!visibilityKey && !orderKey)) return

    try {
      if (visibilityKey) {
        if (Object.keys(columnVisibility.value).length) {
          localStorage.setItem(visibilityKey, JSON.stringify(columnVisibility.value))
        } else {
          localStorage.removeItem(visibilityKey)
        }
      }
      if (orderKey) {
        if (columnOrder.value.length) localStorage.setItem(orderKey, JSON.stringify(columnOrder.value))
        else localStorage.removeItem(orderKey)
      }
    } catch {
      // La configuración de columnas sigue funcionando aunque el navegador no permita guardar localmente.
    }
  }

  function enqueueRemoteSave(tableKey: string) {
    const snapshot = {
      tableKey,
      columnOrder: [...columnOrder.value],
      columnVisibility: { ...columnVisibility.value }
    }

    remoteSaveChain = remoteSaveChain
      .catch(() => undefined)
      .then(async () => {
        await tablePreferencesService.save(snapshot)
      })
      .catch(() => {
        // El respaldo local continúa disponible si el servidor no responde.
      })
  }

  function scheduleRemoteSave() {
    if (!readyPreferenceKey) return
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
    const tableKey = readyPreferenceKey
    remoteSaveTimer = setTimeout(() => {
      remoteSaveTimer = undefined
      enqueueRemoteSave(tableKey)
    }, 450)
  }

  async function loadRemotePreferences(identity: string) {
    const requestId = ++loadRequestId
    const tableKey = resolvedPreferenceKey.value
    readyPreferenceKey = undefined
    loadingIdentity = undefined
    if (!import.meta.client || !tableKey) return

    loadingIdentity = identity
    localChangedDuringLoad = false
    const { hasLocalPreference } = readLocalPreferences()

    try {
      const saved = await tablePreferencesService.get(tableKey)
      if (requestId !== loadRequestId || identity !== resolvedSyncIdentity.value) return

      if (localChangedDuringLoad) {
        readyPreferenceKey = tableKey
        loadingIdentity = undefined
        scheduleRemoteSave()
        return
      }

      if (saved) {
        isHydrating = true
        columnOrder.value = parseOrder(saved.columnOrder)
        columnVisibility.value = parseVisibility(saved.columnVisibility)
        isHydrating = false
      }

      readyPreferenceKey = tableKey
      loadingIdentity = undefined

      // Migra al servidor las preferencias que existían solo en el navegador anterior.
      if (!saved && hasLocalPreference) scheduleRemoteSave()
    } catch {
      if (requestId !== loadRequestId || identity !== resolvedSyncIdentity.value) return
      readyPreferenceKey = tableKey
      loadingIdentity = undefined
      // Si falla la red, se conservan los valores locales y se reintentará al próximo cambio.
    }
  }

  watch(
    resolvedStorageIdentity,
    () => {
      if (!import.meta.client) return
      isHydrating = true
      const { savedVisibility, savedOrder } = readLocalPreferences()
      columnVisibility.value = savedVisibility
      columnOrder.value = savedOrder
      isHydrating = false
    },
    { immediate: true, flush: 'sync' }
  )

  watch(
    [columnVisibility, columnOrder],
    () => {
      if (!import.meta.client) return
      persistLocalPreferences()
      if (isHydrating) return
      if (readyPreferenceKey) {
        scheduleRemoteSave()
      } else if (loadingIdentity) {
        localChangedDuringLoad = true
      }
    },
    { deep: true, flush: 'sync' }
  )

  watch(resolvedSyncIdentity, (identity) => {
    if (!hasMounted) return
    if (remoteSaveTimer) {
      clearTimeout(remoteSaveTimer)
      remoteSaveTimer = undefined
    }
    readyPreferenceKey = undefined
    void loadRemotePreferences(identity)
  })

  onMounted(() => {
    hasMounted = true
    void loadRemotePreferences(resolvedSyncIdentity.value)
  })

  onBeforeUnmount(() => {
    loadRequestId += 1
    if (remoteSaveTimer && readyPreferenceKey) {
      clearTimeout(remoteSaveTimer)
      remoteSaveTimer = undefined
      enqueueRemoteSave(readyPreferenceKey)
    }
  })

  const reorderableColumns = computed(() => {
    const api = table.value?.tableApi
    if (!api) return []

    const columns = api.getAllColumns().filter((col) => {
      if (['select', 'actions', 'action'].includes(col.id)) return false
      if (!col.getCanHide()) return false
      if (col.columnDef?.meta?.disableColumnVisibility) return false
      return true
    })
    const orderIndex = new Map(columnOrder.value.map((id, index) => [id, index]))

    return columns
      .map((column, originalIndex) => ({ column, originalIndex }))
      .sort((a, b) => {
        const aIndex = orderIndex.get(a.column.id)
        const bIndex = orderIndex.get(b.column.id)
        if (aIndex === undefined && bIndex === undefined) return a.originalIndex - b.originalIndex
        return (aIndex ?? Number.MAX_SAFE_INTEGER) - (bIndex ?? Number.MAX_SAFE_INTEGER)
      })
      .map(({ column }) => column)
  })

  function reorderColumns(orderedIds: string[]) {
    const api = table.value?.tableApi
    if (!api) return

    const allColumns = api.getAllColumns()
    const reorderableIds = new Set(reorderableColumns.value.map(col => col.id))
    const requestedIds = orderedIds.filter((id, index) => reorderableIds.has(id) && orderedIds.indexOf(id) === index)
    const requestedSet = new Set(requestedIds)
    const normalizedIds = [
      ...requestedIds,
      ...reorderableColumns.value.map(col => col.id).filter(id => !requestedSet.has(id))
    ]
    let nextReorderableIndex = 0

    // Mantiene en sus posiciones las columnas fijas, como selección y acciones.
    columnOrder.value = allColumns.map((col) => {
      if (!reorderableIds.has(col.id)) return col.id
      return normalizedIds[nextReorderableIndex++]
    })
  }

  function resetColumnVisibility() {
    columnVisibility.value = {}
    columnOrder.value = []
  }

  const columnVisibilityItems = computed(() => {
    void columnVisibility.value
    return reorderableColumns.value.map((col) => ({
      id: col.id,
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
    columnOrder,
    columnVisibilityItems,
    reorderColumns,
    resetColumnVisibility
  }
}
