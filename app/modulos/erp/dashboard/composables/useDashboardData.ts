import type { DashboardData, DashboardPersonal } from '../types/dashboard.types'

import { useDashboardDataService } from '../services/dashboard-data.service'

export function useDashboardData() {
  const service = useDashboardDataService()
  const data = ref<DashboardData | null>(null)
  const personal = ref<DashboardPersonal | null>(null)
  const loading = ref(false)
  let dataRequest = 0

  const fetchData = async (days?: number) => {
    const request = ++dataRequest
    loading.value = true
    try {
      const result = await service.find(days)
      if (request === dataRequest) data.value = result
    } catch {
    } finally {
      if (request === dataRequest) loading.value = false
    }
  }

  const fetchPersonal = async () => {
    try {
      personal.value = await service.findPersonal()
    } catch {
    }
  }

  return {
    data,
    personal,
    loading,
    fetchData,
    fetchPersonal,
  }
}
