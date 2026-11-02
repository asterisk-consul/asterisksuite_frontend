import type { DashboardData, DashboardPersonal } from '../types/dashboard.types'

export const useDashboardDataService = () => ({
  find: (days?: number) => $fetch<DashboardData>('/api/backend/dashboard/data', { query: { days } }),
  findPersonal: () => $fetch<DashboardPersonal>('/api/backend/dashboard/personal'),
})
