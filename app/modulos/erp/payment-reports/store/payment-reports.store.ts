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

  // =========================
  // BY USER
  // =========================

  const fetchByUser = async (params?: PaymentReportQuery) => {
    try {
      loading.value = true
      byUser.value = await service.findByUser(params)
      return byUser.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CASH BOX DAILY
  // =========================

  const fetchCashBoxDaily = async (params?: PaymentReportQuery) => {
    try {
      loading.value = true
      cashBoxDaily.value = await service.cashBoxDaily(params)
      return cashBoxDaily.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // BANK DAILY
  // =========================

  const fetchBankDaily = async (params?: PaymentReportQuery) => {
    try {
      loading.value = true
      bankDaily.value = await service.bankDaily(params)
      return bankDaily.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // DAILY SUMMARY
  // =========================

  const fetchDailySummary = async (params?: PaymentReportQuery) => {
    try {
      loading.value = true
      dailySummary.value = await service.dailySummary(params)
      return dailySummary.value
    } finally {
      loading.value = false
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
    fetchDailySummary
  }
})
