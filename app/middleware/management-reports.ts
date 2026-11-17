import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRolesStore } from '~/modulos/access-control/stores/roles.store'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  const roles = useRolesStore()
  const company = auth.selectedCompany
  const isReportsIndex = to.path === '/erp/reports'

  if (company?.role === 'OWNER' && !isReportsIndex) return

  const reportReadPermissions = [
    'management_reports.read',
    'management_reports.management.read',
    'management_reports.consolidated.read',
    'management_reports.financial_results.read',
    'management_reports.sales_products.read',
    'management_reports.customers.read',
    'management_reports.suppliers.read',
    'management_reports.hr.read',
    'management_reports.treasury.read',
    'management_reports.documents.read',
    'management_reports.inventory.read',
  ]

  const viewPermissions: Record<string, string> = {
    consolidated: 'management_reports.consolidated.read',
    customers: 'management_reports.customers.read',
    suppliers: 'management_reports.suppliers.read',
    hr: 'management_reports.hr.read',
    treasury: 'management_reports.treasury.read',
    documents: 'management_reports.documents.read',
    inventory: 'management_reports.inventory.read',
  }
  const permission = (to.path.endsWith('/financial-results') || to.path.endsWith('/financial-results-preview'))
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
    if (company?.role === 'OWNER' && isReportsIndex) return
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }

  if (isReportsIndex) {
    const canOpenReports = reportReadPermissions.some(permission => roles.myPermissions?.permissions.includes(permission))
    if (company?.role !== 'OWNER' && !canOpenReports) {
      return abortNavigation(createError({
        statusCode: 403,
        statusMessage: 'No tenés permisos activos para ver reportes.',
      }))
    }
    return
  }

  if (!roles.myPermissions?.permissions.includes('management_reports.read')
    && !roles.myPermissions?.permissions.includes(permission)) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'No tenés permiso para ver los reportes gerenciales.',
    }))
  }
})
