import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  const roles = useRolesStore()
  const company = auth.selectedCompany

  if (company?.role === 'OWNER') return

  const viewPermissions: Record<string, string> = {
    consolidated: 'management_reports.consolidated.read',
    customers: 'management_reports.customers.read',
    suppliers: 'management_reports.suppliers.read',
    hr: 'management_reports.hr.read',
    treasury: 'management_reports.treasury.read',
    documents: 'management_reports.documents.read',
    inventory: 'management_reports.inventory.read',
  }
  const permission = to.path.endsWith('/financial-results')
    ? 'management_reports.financial_results.read'
    : to.path.endsWith('/sales-products')
      ? 'management_reports.sales_products.read'
      : to.path.endsWith('/consolidated')
        ? viewPermissions[String(to.query.view ?? 'consolidated')] ?? viewPermissions.consolidated
        : to.path.endsWith('/builder')
          ? 'management_reports.builder.read'
          : 'management_reports.management.read'

  try {
    await roles.fetchMyPermissionsIfNeeded(company?.id, auth.user?.id)
  } catch {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }

  if (!roles.myPermissions?.permissions.includes('management_reports.read')
    && !roles.myPermissions?.permissions.includes(permission)) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }
})
