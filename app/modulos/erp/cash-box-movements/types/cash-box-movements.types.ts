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
  payment?: { status: string } | null
  bank_account_id?: string | null
  date: string

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CashBoxCheckDetails {
  id: string
  check_number: string
  bank_name: string
  issuer_name: string
  issuer_id?: string | null
  amount: number
  available_amount?: number | null
  currency_code: string
  issue_date: string
  due_date: string
  status: string
  is_own: boolean
  deposit_date?: string | null
  clearing_date?: string | null
}

export interface CashBoxMovementDetails extends CashBoxMovement {
  employee?: { id: string; first_name: string; last_name: string } | null
  session?: { id: string; opened_at: string; closed_at?: string | null; status: string } | null
  linked_check?: CashBoxCheckDetails | null
  payment?: {
    id: string
    number: number
    type: 'PAYMENT' | 'COLLECTION' | 'EXPENSE'
    payment_method: string
    amount: number
    currency_code: string
    exchange_rate?: number | null
    status: string
    date: string
    payment_date?: string | null
    description?: string | null
    reference?: string | null
    party?: { id: string; name: string; tax_id?: string | null } | null
    documents: Array<{
      id: string
      amount_applied: number
      document: {
        id: string
        number: number
        date: string
        total: number
        currency_code?: string | null
        document_types: { code: string; description: string }
      }
    }>
    checks: CashBoxCheckDetails[]
    payment_allocations: Array<{ amount_applied: number; check: CashBoxCheckDetails }>
  } | null
}

export interface CreateCashBoxMovementInput {
  cash_box_id: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
  currency_code: string
  concept: string
  description: string
  date?: string
}

export interface ReverseCashBoxMovementInput {
  cash_box_id: string
  reason: string
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
