import { computed } from 'vue'
import { usePermissionsStore } from '../stores/permissions.store'
import type { Permission } from '~/modulos/access-control/types/roles.types'

export interface PermissionSelectItem {
  label: string
  value: string
  module?: string
}

export function usePermissions() {
  const store = usePermissionsStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const findByCode = async (code: string) => store.findByCode(code)

  // =========================
  // COMPUTED
  // =========================

  const items = computed<PermissionSelectItem[]>(() =>
    store.items.map((perm) => ({
      label: perm.name,
      value: perm.code,
      module: perm.module
    }))
  )

  const groupedByModule = computed(() => {
    const groups: Record<string, Permission[]> = {}
    for (const perm of store.items) {
      const mod = perm.module || 'general'
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(perm)
    }
    return groups
  })

  // =========================
  // HELPERS
  // =========================

  const findByCodeSync = (code: string) =>
    store.items.find((p) => p.code === code)

  const exists = (code: string) =>
    store.items.some((p) => p.code === code)

  // =========================
  // RETURN
  // =========================

  return {
    // state
    permissions: computed(() => store.items),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,
    groupedByModule,

    // helpers
    findByCode,
    findByCodeSync,
    exists,

    // actions
    init
  }
}
