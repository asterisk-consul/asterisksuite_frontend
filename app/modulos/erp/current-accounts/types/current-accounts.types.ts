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
  | 'INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'NO_DEBIT'
  | 'DEBIT'
  | 'CREDIT'
  | 'OPENING_BALANCE'

export interface CurrentAccount {
  id: string
  party_id: string
  party_type: string
  balance: number
  active: boolean

  party?: {
    id: string
    name: string
  } | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
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
  user_name?: string | null
  date: string

  created_at?: string
  updated_at?: string
}

export interface CreateCurrentAccountEntryInput {
  party_id: string
  party_type: string
  currency_code: string
  type: AccountEntryType
  amount: number
  exchange_rate?: number
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
