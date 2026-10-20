import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  const roles = useRolesStore()
  const company = auth.selectedCompany

  if (company?.role === 'OWNER' || company?.role === 'ADMIN') return

  try {
    await roles.fetchMyPermissionsIfNeeded(company?.id, auth.user?.id)
  } catch {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }

  if (!roles.myPermissions?.permissions.includes('management_reports.read')) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }
})
