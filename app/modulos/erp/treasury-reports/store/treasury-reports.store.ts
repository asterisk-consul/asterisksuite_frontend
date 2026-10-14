import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useTreasuryReportsService } from '~/modulos/erp/treasury-reports/service/treasury-reports.service'

import type {
  TreasuryDashboard,
  TreasuryMovement,
  TreasuryMovementsQuery
} from '~/modulos/erp/treasury-reports/types/treasury-reports.types'

export const useTreasuryReportsStore = defineStore('treasury-reports', () => {
  const service = useTreasuryReportsService()

  const dashboard = ref<TreasuryDashboard | null>(null)
  const movements = ref<TreasuryMovement[]>([])

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    dashboard.value = null
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
    movements,
    loading,

    // actions
    fetchDashboard,
    fetchMovements,
    reset
  }
})
