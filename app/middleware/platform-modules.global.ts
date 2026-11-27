import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
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

  if (to.path.replace(/\/$/, '') === '/erp/tasks') {
    const roles = useRoles()
    if (store.hasModule('CRM')) {
      try {
        await roles.fetchMyPermissionsIfNeeded(companyId, auth.user?.id)
      } catch {
        // Si no se pudieron cargar los permisos, no se amplía el acceso al CRM.
      }
    }
    const canOpenCrmTasks = auth.selectedCompany?.role === 'OWNER' || roles.hasPermission('tasks.read')
    if (!store.hasModule('CRM') || !canOpenCrmTasks) {
      try {
        const hasSharedTasks = await $fetch<boolean>('/api/backend/erp/tasks/shared/available')
        if (hasSharedTasks) return navigateTo('/erp/tasks/shared')
      } catch {
        // Sin una tarea compartida explícita, se mantiene el bloqueo normal del CRM.
      }
    }
  }

  if (!store.hasModule(moduleCode)) {
    return navigateTo({
      path: '/module-unavailable',
      query: { module: moduleCode, from: to.fullPath }
    })
  }
})
