export type AccountEntryType =
  | 'PAYMENT'
  | 'VALE_DEBIT'
  | 'VALE_CREDIT'
  | 'COLLECTION'
  | 'ADVANCE'
  | 'LOAN'
  | 'LOAN_PAYMENT'
  | 'ADJUSTMENT'
  | 'PAYROLL_DEDUCTION'
  | 'TRANSFER'
  | 'CHECK_ISSUED'
  | 'CHECK_RECEIVED'
  | 'INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'NO_DEBIT'
  | 'DEBIT'
  | 'CREDIT'
  | 'OPENING_BALANCE'
  | 'WITHHOLDING'

export interface CurrentAccountEntryLast {
  type: string
  description: string | null
  reference_type: string | null
  date: string
}

export interface CurrentAccount {
  id: string
  party_id: string
  party_type: string
  currency_code?: string | null
  balance: number
  active: boolean
  last_entry_date?: string | null
  last_entry?: CurrentAccountEntryLast | null

  party?: {
    id: string
    name: string
    tax_id?: string | null
  } | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface DocumentChainNode {
  id: string
  number: number
  type_code: string
  description: string | null
  role: 'parent' | 'current' | 'child'
}

export interface CurrentAccountPaymentCheck {
  id: string
  check_number: string
  bank_name: string
  issuer_name: string
  amount: number | string
  currency_code: string
  issue_date: string
  due_date: string
  status: string
  is_own: boolean
}

export interface CurrentAccountPaymentTender {
  id: string
  method: string
  amount: number | string
  cash_box?: { id: string; name: string } | null
  bank_account?: { id: string; name: string; bank_name: string } | null
}

export interface CurrentAccountEntryPayment {
  id: string
  number: number
  type: string
  status: string
  deleted_at?: string | null
  date: string
  payment_date?: string | null
  amount: number | string
  currency_code: string
  exchange_rate?: number | string | null
  payment_method: string
  reference?: string | null
  description?: string | null
  cash_box?: { id: string; name: string } | null
  bank_account?: { id: string; name: string; bank_name: string } | null
  documents?: Array<{
    id: string
    amount_applied: number | string
    document: {
      id: string
      number: number | string
      date: string
      total: number | string
      currency_code: string
      document_types?: { code: string; description: string } | null
    }
  }>
  checks?: CurrentAccountPaymentCheck[]
  payment_allocations?: Array<{
    amount_applied: number | string
    check: CurrentAccountPaymentCheck | null
  }>
  tenders?: CurrentAccountPaymentTender[]
}

export interface CurrentAccountEntry {
  id: string
  current_account_id: string
  type: AccountEntryType
  amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string | null
  converted_amount?: number | null
  balance_before: number
  balance_after: number
  description?: string | null
  reference_type?: string | null
  reference_id?: string | null
  payment_id?: string | null
  payment?: CurrentAccountEntryPayment | null
  user_name?: string | null
  date: string
  document_chain?: DocumentChainNode[] | null
  vale_type?: string | null
  vale_status?: string | null

  created_at?: string
  updated_at?: string
}

export interface CreateCurrentAccountEntryInput {
  party_id: string
  party_type: string
  currency_code: string
  type: AccountEntryType
  amount: number
  balance_effect?: 'INCREASE' | 'DECREASE'
  exchange_rate?: number
  rate_type?: string
  description?: string
  reference_type?: string
  reference_id?: string
  payment_id?: string
  date?: string
}

export interface CurrentAccountStatement {
  account: CurrentAccount
  balance: number
  entries: CurrentAccountEntry[]
}
