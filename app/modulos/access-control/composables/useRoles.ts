import { computed } from 'vue'
import { useRolesStore } from '../stores/roles.store'
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  EffectivePermissions
} from '~/modulos/access-control/types/roles.types'

export interface RoleSelectItem {
  label: string
  value: string
}

export function useRoles() {
  const store = useRolesStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateRoleDto) => store.create(payload)

  const update = async (id: string, payload: UpdateRoleDto) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const updatePermissions = async (id: string, permissions: string[]) =>
    store.updatePermissions(id, permissions)

  // =========================
  // USER ROLES
  // =========================

  const getUserRoles = async (userId: string) => store.fetchUserRoles(userId)

  const assignRoles = async (userId: string, roleIds: string[]) =>
    store.assignRoles(userId, roleIds)

  // =========================
  // MY PERMISSIONS
  // =========================

  const fetchMyPermissions = async () => store.fetchMyPermissions()

  const fetchMyPermissionsIfNeeded = async (companyId?: string | null, userId?: string | null) =>
    store.fetchMyPermissionsIfNeeded(companyId, userId)

  const clearMyPermissions = () => store.clearMyPermissions()

  // =========================
  // COMPUTED
  // =========================

  const items = computed<RoleSelectItem[]>(() =>
    store.items.map((role) => ({
      label: role.name,
      value: role.id
    }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((r) => r.id === id)

  const formatLabel = (id: string) => {
    const role = store.items.find((r) => r.id === id)
    return role?.name ?? ''
  }

  const hasPermission = (permissionCode: string) => {
    if (!store.myPermissions) return false
    return store.myPermissions.permissions.includes(permissionCode)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    roles: computed(() => store.items),
    current: computed(() => store.current),
    myPermissions: computed(() => store.myPermissions),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,

    // helpers
    findById,
    formatLabel,
    hasPermission,

    // actions
    init,
    create,
    update,
    remove,
    updatePermissions,

    // user roles
    getUserRoles,
    assignRoles,

    // my permissions
    fetchMyPermissions,
    fetchMyPermissionsIfNeeded,
    clearMyPermissions
  }
}
