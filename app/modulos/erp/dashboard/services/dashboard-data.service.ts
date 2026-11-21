import type { DashboardData, DashboardPersonal } from '../types/dashboard.types'

export const useDashboardDataService = () => ({
  find: (days?: number) => $fetch<DashboardData>('/api/backend/dashboard/data', { query: { days } }),
  findPersonal: (options?: { date?: string; activity_page?: number }) =>
    $fetch<DashboardPersonal>('/api/backend/dashboard/personal', { query: options }),
})
