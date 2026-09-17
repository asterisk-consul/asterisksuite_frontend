import type { DashboardData, DashboardPersonal } from '../types/dashboard.types'

export function useDashboardData() {
  const data = ref<DashboardData | null>(null)
  const personal = ref<DashboardPersonal | null>(null)
  const loading = ref(false)

  const fetchData = async () => {
    loading.value = true
    try {
      data.value = await $fetch<DashboardData>('/api/backend/dashboard/data')
    } catch {
    } finally {
      loading.value = false
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
