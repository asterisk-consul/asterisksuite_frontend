import { useAuthStore } from '~/modulos/auth/auth.store'
import { resolvePlatformModuleForRoute } from '~/modulos/platform-modules/platform-module-routes'
import { usePlatformModulesStore } from '~/modulos/platform-modules/platform-modules.store'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/module-unavailable') return

  const moduleCode = resolvePlatformModuleForRoute(to.path)
  if (!moduleCode) return

  const auth = useAuthStore()
  await auth.init()
  if (!auth.selectedCompany) {
    auth.autoSelectByHostname(useRequestURL().hostname)
  }
  const companyId = auth.selectedCompany?.id
  if (!companyId) return

  const store = usePlatformModulesStore()
  try {
    await store.fetchEffective(companyId)
  } catch {
    return
  }

  if (!store.hasModule(moduleCode)) {
    return navigateTo({
      path: '/module-unavailable',
      query: { module: moduleCode, from: to.fullPath }
    })
  }
})
