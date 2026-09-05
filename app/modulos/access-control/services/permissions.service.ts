import type { Permission } from '~/modulos/access-control/types/roles.types'

const baseUrl = '/api/access-control/permissions'

export const usePermissionsService = () => {
  const getFetch = () => useRequestFetch()

  // =========================
  // FIND ALL
  // =========================

  const findAll = () => getFetch()<Permission[]>(`${baseUrl}`)

  // =========================
  // FIND BY CODE
  // =========================

  const findByCode = (code: string) => getFetch()<Permission>(`${baseUrl}/${code}`)

  return {
    findAll,
    findByCode
  }
}
