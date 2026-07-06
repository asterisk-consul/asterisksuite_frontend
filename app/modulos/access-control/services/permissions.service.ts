import type { Permission } from '~/modulos/access-control/types/roles.types'

const baseUrl = '/api/access-control/permissions'

export const usePermissionsService = () => {
  // =========================
  // FIND ALL
  // =========================

  const findAll = () => $fetch<Permission[]>(`${baseUrl}`)

  // =========================
  // FIND BY CODE
  // =========================

  const findByCode = (code: string) => $fetch<Permission>(`${baseUrl}/${code}`)

  return {
    findAll,
    findByCode
  }
}
