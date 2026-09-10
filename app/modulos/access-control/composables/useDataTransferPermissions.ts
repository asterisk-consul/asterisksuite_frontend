import { useCompanyRole } from '~/composables/useCompanyRole'
import { useRoles } from './useRoles'

export function useDataTransferPermissions() {
  const { isOwner } = useCompanyRole()
  const { hasPermission } = useRoles()

  const canImport = (permission: string) =>
    isOwner.value || hasPermission(permission) || hasPermission('data_import.execute')

  const canExport = (permission: string) =>
    isOwner.value || hasPermission(permission)

  return { canImport, canExport }
}
