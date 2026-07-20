export interface PaymentReportQuery {
  date_from?: string
  date_to?: string
  created_by?: string
  currency_code?: string
  cash_box_id?: string
  bank_account_id?: string
  date?: string
}

export interface PaymentByUserReport {
  user_id: string
  user_name: string
  total_amount: number
  count: number
  currency_code: string
}

export interface CashBoxDailyReport {
  cash_box_id: string
  cash_box_name: string
  date: string
  total_income: number
  total_expenses: number
  balance: number
  currency_code: string
  movement_count: number
}

export interface BankDailyReport {
  bank_account_id: string
  bank_account_name: string
  bank_name: string
  date: string
  total_credits: number
  total_debits: number
  balance: number
  currency_code: string
  movement_count: number
}

export interface DailySummaryReport {
  date: string
  total_income: number
  total_expenses: number
  net: number
  currency_code: string
  payment_count: number
  collection_count: number
}
