import type { DashboardConfig } from '../types/dashboard.types'

const baseUrl = '/api/backend/dashboard/config'

export const useDashboardConfigService = () => ({
  find: (dashboardKey: string) => $fetch<DashboardConfig | null>(baseUrl, { query: { dashboard_key: dashboardKey } }),
  save: (dashboardKey: string, widgets: DashboardConfig['widgets']) =>
    $fetch<void>(baseUrl, { method: 'POST', body: { dashboard_key: dashboardKey, widgets } }),
})
