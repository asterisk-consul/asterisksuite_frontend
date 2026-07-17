import { computed } from 'vue'
import { useTreasuryReportsStore } from '../store/treasury-reports.store'

import type { TreasuryMovementsQuery } from '~/modulos/erp/treasury-reports/types/treasury-reports.types'

export function useTreasuryReports() {
  const store = useTreasuryReportsStore()

  // =========================
  // ACTIONS
  // =========================

  const fetchDashboard = async () => store.fetchDashboard()

  const fetchMovements = async (params?: TreasuryMovementsQuery) =>
    store.fetchMovements(params)

  // =========================
  // RETURN
  // =========================

  return {
    // state
    dashboard: computed(() => store.dashboard),
    movements: computed(() => store.movements),
    loading: computed(() => store.loading),

    // actions
    fetchDashboard,
    fetchMovements
  }
}
