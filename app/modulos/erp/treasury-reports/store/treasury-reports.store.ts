import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useTreasuryReportsService } from '~/modulos/erp/treasury-reports/service/treasury-reports.service'

import type {
  TreasuryDashboard,
  TreasuryPending,
  TreasuryMovement,
  TreasuryMovementsQuery
} from '~/modulos/erp/treasury-reports/types/treasury-reports.types'

export const useTreasuryReportsStore = defineStore('treasury-reports', () => {
  const service = useTreasuryReportsService()

  const dashboard = ref<TreasuryDashboard | null>(null)
  const pending = ref<TreasuryPending | null>(null)
  const pendingLoading = ref(false)
  const pendingError = ref(false)
  const movements = ref<TreasuryMovement[]>([])

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    dashboard.value = null
    pending.value = null
    pendingLoading.value = false
    pendingError.value = false
    movements.value = []
    loading.value = false
  }

  // =========================
  // DASHBOARD
  // =========================

  const fetchDashboard = async (checksDays?: number) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.dashboard(checksDays)
      if (generation === requestGeneration) dashboard.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const fetchPending = async () => {
    const generation = requestGeneration
    pendingLoading.value = true
    pendingError.value = false
    try {
      const data = await service.pending()
      if (generation === requestGeneration) pending.value = data
      return data
    } catch {
      if (generation === requestGeneration) pendingError.value = true
      return null
    } finally {
      if (generation === requestGeneration) pendingLoading.value = false
    }
  }

  // =========================
  // MOVEMENTS
  // =========================

  const fetchMovements = async (params?: TreasuryMovementsQuery) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.movements(params)
      if (generation === requestGeneration) movements.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  return {
    // state
    dashboard,
    pending,
    pendingLoading,
    pendingError,
    movements,
    loading,

    // actions
    fetchDashboard,
    fetchPending,
    fetchMovements,
    reset
  }
})
