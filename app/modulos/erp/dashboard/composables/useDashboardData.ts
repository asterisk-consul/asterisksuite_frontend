import type { DashboardData, DashboardPersonal } from '../types/dashboard.types'

export function useDashboardData() {
  const data = ref<DashboardData | null>(null)
  const personal = ref<DashboardPersonal | null>(null)
  const loading = ref(false)
  let dataRequest = 0

  const fetchData = async (days?: number) => {
    const request = ++dataRequest
    loading.value = true
    try {
      const result = await $fetch<DashboardData>('/api/backend/dashboard/data', {
        query: { days: days ?? undefined },
      })
      if (request === dataRequest) data.value = result
    } catch {
    } finally {
      if (request === dataRequest) loading.value = false
    }
  }

  const fetchPersonal = async () => {
    try {
      personal.value = await $fetch<DashboardPersonal>('/api/backend/dashboard/personal')
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
