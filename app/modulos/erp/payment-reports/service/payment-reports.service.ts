import type {
  PaymentReportQuery,
  PaymentByUserReport,
  CashBoxDailyReport,
  BankDailyReport,
  DailySummaryReport
} from '~/modulos/erp/payment-reports/types/payment-reports.types'

const urlBase = '/api/erp/payment-reports'

export const usePaymentReportsService = () => {
  const findByUser = (params?: PaymentReportQuery) => {
    return $fetch<PaymentByUserReport[]>(`${urlBase}/by-user`, {
      method: 'GET',
      query: params
    })
  }

  const cashBoxDaily = (params?: PaymentReportQuery) => {
    return $fetch<CashBoxDailyReport[]>(`${urlBase}/cash-box-daily`, {
      method: 'GET',
      query: params
    })
  }

  const bankDaily = (params?: PaymentReportQuery) => {
    return $fetch<BankDailyReport[]>(`${urlBase}/bank-daily`, {
      method: 'GET',
      query: params
    })
  }

  const dailySummary = (params?: PaymentReportQuery) => {
    return $fetch<DailySummaryReport[]>(`${urlBase}/daily-summary`, {
      method: 'GET',
      query: params
    })
  }

  return {
    findByUser,
    cashBoxDaily,
    bankDaily,
    dailySummary
  }
}
