import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.init()

  if (!auth.isLogged) {
    return navigateTo('/login')
  }

  // User has no companies — redirect to create first company
  if (auth.companies.length === 0) {
    return navigateTo('/create-company')
  }

  if (!auth.selectedCompany) {
    const url = useRequestURL()
    auth.autoSelectByHostname(url.hostname)
  }

  if (auth.needsCompanySelection) {
    return navigateTo('/select-company')
  }

  try {
    const rolesStore = useRolesStore()
    await rolesStore.fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
  } catch {
    // best-effort: permission fetch failure should not block page render
  }
})
