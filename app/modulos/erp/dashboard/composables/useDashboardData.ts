import type { DashboardData } from '../types/dashboard.types'

export function useDashboardData() {
  const data = ref<DashboardData | null>(null)
  const loading = ref(false)

  const fetchData = async () => {
    loading.value = true
    try {
      data.value = await $fetch<DashboardData>('/api/erp/dashboard/data')
    } catch {
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    fetchData,
  }
}
