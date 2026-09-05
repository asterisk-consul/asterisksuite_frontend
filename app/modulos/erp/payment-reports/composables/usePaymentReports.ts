import { computed } from 'vue'
import { usePaymentReportsStore } from '../store/payment-reports.store'

import type { PaymentReportQuery } from '~/modulos/erp/payment-reports/types/payment-reports.types'

export function usePaymentReports() {
  const store = usePaymentReportsStore()

  // =========================
  // ACTIONS
  // =========================

  const fetchByUser = async (params?: PaymentReportQuery) => store.fetchByUser(params)

  const fetchCashBoxDaily = async (params?: PaymentReportQuery) =>
    store.fetchCashBoxDaily(params)

  const fetchBankDaily = async (params?: PaymentReportQuery) =>
    store.fetchBankDaily(params)

  const fetchDailySummary = async (params?: PaymentReportQuery) =>
    store.fetchDailySummary(params)

  // =========================
  // RETURN
  // =========================

  return {
    // state
    byUser: computed(() => store.byUser),
    cashBoxDaily: computed(() => store.cashBoxDaily),
    bankDaily: computed(() => store.bankDaily),
    dailySummary: computed(() => store.dailySummary),
    loading: computed(() => store.loading),

    // actions
    fetchByUser,
    fetchCashBoxDaily,
    fetchBankDaily,
    fetchDailySummary
  }
}
