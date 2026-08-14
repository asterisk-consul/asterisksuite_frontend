import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  EffectivePermissions
} from '~/modulos/access-control/types/roles.types'

const baseUrl = '/api/access-control/roles'

export const useRolesService = () => {
  const getFetch = () => useRequestFetch()

  // =========================
  // FIND ALL
  // =========================

  const findAll = () => getFetch()<Role[]>(`${baseUrl}`)

  // =========================
  // FIND ONE
  // =========================

  const findOne = (id: string) => getFetch()<Role>(`${baseUrl}/${id}`)

  // =========================
  // CREATE
  // =========================

  const create = (payload: CreateRoleDto) =>
    getFetch()<Role>(`${baseUrl}`, {
      method: 'POST',
      body: payload
    })

  // =========================
  // UPDATE
  // =========================

  const update = (id: string, payload: UpdateRoleDto) =>
    getFetch()<Role>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  // =========================
  // UPDATE PERMISSIONS
  // =========================

  const updatePermissions = (id: string, permissions: string[]) =>
    getFetch()<Role>(`${baseUrl}/${id}/permissions`, {
      method: 'PUT',
      body: { permissions }
    })

  // =========================
  // DELETE
  // =========================

  const remove = (id: string) =>
    getFetch()<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  // =========================
  // USER ROLES
  // =========================

  const getUserRoles = (userId: string) =>
    getFetch()<Role[]>(`/api/access-control/users/${userId}/roles`)

  const assignRoles = (userId: string, roleIds: string[]) =>
    getFetch()<void>(`/api/access-control/users/${userId}/roles`, {
      method: 'PUT',
      body: { roleIds }
    })

  // =========================
  // USER PERMISSIONS
  // =========================

  const getEffectivePermissions = (userId: string) =>
    getFetch()<EffectivePermissions>(`/api/access-control/users/${userId}/permissions`)

  const getMyPermissions = () =>
    getFetch()<EffectivePermissions>('/api/access-control/users/me/permissions')

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
