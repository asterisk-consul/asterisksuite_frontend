export type AccountEntryType =
  | 'PAYMENT'
  | 'COLLECTION'
  | 'ADVANCE'
  | 'LOAN'
  | 'LOAN_PAYMENT'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'CHECK_ISSUED'
  | 'CHECK_RECEIVED'
  | 'CHECK_BOUNCED'
  | 'DEBIT'
  | 'CREDIT'

export interface CashBoxMovement {
  id: string
  cash_box_id: string
  session_id?: string | null
  employee_id?: string | null
  type: AccountEntryType
  amount: number
  currency_code: string
  exchange_rate?: number | null
  balance_before: number
  balance_after: number
  description?: string | null
  reference_type?: string | null
  reference_id?: string | null
  payment_id?: string | null
  bank_account_id?: string | null
  date: string

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateCashBoxMovementInput {
  cash_box_id: string
  session_id?: string
  employee_id?: string
  type: AccountEntryType
  amount: number
  currency_code: string
  exchange_rate?: number
  description?: string
  reference_type?: string
  reference_id?: string
  payment_id?: string
  bank_account_id?: string
  date?: string
}

export interface UpdateCashBoxMovementInput {
  description?: string
  reference_type?: string
  reference_id?: string
  payment_id?: string
}

export interface FilterCashBoxMovementInput {
  cash_box_id?: string
  session_id?: string
  employee_id?: string
  type?: string
  currency_code?: string
  date_from?: string
  date_to?: string
}
