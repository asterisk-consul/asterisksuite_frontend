import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  if (auth.selectedCompany?.role === 'OWNER') return

  const roles = useRolesStore()
  try {
    await roles.fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
  } catch {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para consultar la papelera.',
    }))
  }

  if (!roles.myPermissions?.permissions.includes('trash.read')) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para consultar la papelera.',
    }))
  }
})
