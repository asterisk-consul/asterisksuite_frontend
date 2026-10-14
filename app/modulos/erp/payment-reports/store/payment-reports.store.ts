import { defineStore } from 'pinia'
import { ref } from 'vue'

import { usePaymentReportsService } from '~/modulos/erp/payment-reports/service/payment-reports.service'

import type {
  PaymentReportQuery,
  PaymentByUserReport,
  CashBoxDailyReport,
  BankDailyReport,
  DailySummaryReport
} from '~/modulos/erp/payment-reports/types/payment-reports.types'

export const usePaymentReportsStore = defineStore('payment-reports', () => {
  const service = usePaymentReportsService()

  const byUser = ref<PaymentByUserReport[]>([])
  const cashBoxDaily = ref<CashBoxDailyReport[]>([])
  const bankDaily = ref<BankDailyReport[]>([])
  const dailySummary = ref<DailySummaryReport[]>([])

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    byUser.value = []
    cashBoxDaily.value = []
    bankDaily.value = []
    dailySummary.value = []
    loading.value = false
  }

  // =========================
  // BY USER
  // =========================

  const fetchByUser = async (params?: PaymentReportQuery) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findByUser(params)
      if (generation === requestGeneration) byUser.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // CASH BOX DAILY
  // =========================

  const fetchCashBoxDaily = async (params?: PaymentReportQuery) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.cashBoxDaily(params)
      if (generation === requestGeneration) cashBoxDaily.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // BANK DAILY
  // =========================

  const fetchBankDaily = async (params?: PaymentReportQuery) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.bankDaily(params)
      if (generation === requestGeneration) bankDaily.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // DAILY SUMMARY
  // =========================

  const fetchDailySummary = async (params?: PaymentReportQuery) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.dailySummary(params)
      if (generation === requestGeneration) dailySummary.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  return {
    // state
    byUser,
    cashBoxDaily,
    bankDaily,
    dailySummary,
    loading,

    // actions
    fetchByUser,
    fetchCashBoxDaily,
    fetchBankDaily,
    fetchDailySummary,
    reset
  }
})
