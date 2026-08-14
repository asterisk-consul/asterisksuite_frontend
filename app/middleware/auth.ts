import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.init()

  if (!auth.isLogged) {
    return navigateTo('/login')
  }

  if (!auth.selectedCompany) {
    const url = useRequestURL()
    auth.autoSelectByHostname(url.hostname)
  }

  if (auth.needsCompanySelection) {
    return navigateTo('/select-company')
  }

  const rolesStore = useRolesStore()
  await rolesStore.fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
})
