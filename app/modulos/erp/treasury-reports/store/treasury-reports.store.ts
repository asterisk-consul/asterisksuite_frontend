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

  // =========================
  // DASHBOARD
  // =========================

  const fetchDashboard = async () => {
    try {
      loading.value = true
      dashboard.value = await service.dashboard()
      return dashboard.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // MOVEMENTS
  // =========================

  const fetchMovements = async (params?: TreasuryMovementsQuery) => {
    try {
      loading.value = true
      movements.value = await service.movements(params)
      return movements.value
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    dashboard,
    movements,
    loading,

    // actions
    fetchDashboard,
    fetchMovements
  }
})
