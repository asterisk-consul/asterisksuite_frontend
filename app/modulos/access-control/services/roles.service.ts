import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  EffectivePermissions
} from '~/modulos/access-control/types/roles.types'

const baseUrl = '/api/access-control/roles'

export const useRolesService = () => {
  // =========================
  // FIND ALL
  // =========================

  const findAll = () => $fetch<Role[]>(`${baseUrl}`)

  // =========================
  // FIND ONE
  // =========================

  const findOne = (id: string) => $fetch<Role>(`${baseUrl}/${id}`)

  // =========================
  // CREATE
  // =========================

  const create = (payload: CreateRoleDto) =>
    $fetch<Role>(`${baseUrl}`, {
      method: 'POST',
      body: payload
    })

  // =========================
  // UPDATE
  // =========================

  const update = (id: string, payload: UpdateRoleDto) =>
    $fetch<Role>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  // =========================
  // UPDATE PERMISSIONS
  // =========================

  const updatePermissions = (id: string, permissions: string[]) =>
    $fetch<Role>(`${baseUrl}/${id}/permissions`, {
      method: 'PUT',
      body: { permissions }
    })

  // =========================
  // DELETE
  // =========================

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  // =========================
  // USER ROLES
  // =========================

  const getUserRoles = (userId: string) =>
    $fetch<Role[]>(`/api/access-control/users/${userId}/roles`)

  const assignRoles = (userId: string, roleIds: string[]) =>
    $fetch<void>(`/api/access-control/users/${userId}/roles`, {
      method: 'PUT',
      body: { roleIds }
    })

  // =========================
  // USER PERMISSIONS
  // =========================

  const getEffectivePermissions = (userId: string) =>
    $fetch<EffectivePermissions>(`/api/access-control/users/${userId}/permissions`)

  const getMyPermissions = () =>
    $fetch<EffectivePermissions>('/api/access-control/users/me/permissions')

  return {
    findAll,
    findOne,
    create,
    update,
    updatePermissions,
    remove,
    getUserRoles,
    assignRoles,
    getEffectivePermissions,
    getMyPermissions
  }
}
