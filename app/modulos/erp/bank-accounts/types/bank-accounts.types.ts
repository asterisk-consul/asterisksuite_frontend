export interface BankAccount {
  id: string
  name: string
  bank_name: string
  account_type: string
  cbu?: string | null
  alias?: string | null
  account_number?: string | null
  currency_code: string
  balance: number
  active: boolean

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface BankAccountMovement {
  id: string
  bank_account_id: string
  type: string
  amount: number
  currency_code: string
  exchange_rate?: number | null
  balance_before: number
  balance_after: number
  description?: string | null
  reference_type?: string | null
  reference_id?: string | null
  payment_id?: string | null
  date: string

  created_at?: string
  updated_at?: string
}

export interface CreateBankAccountInput {
  name: string
  bank_name: string
  account_type: string
  cbu?: string
  alias?: string
  account_number?: string
  currency_code: string
  balance?: number
  active?: boolean
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {}

export interface BankAccountUserRole {
  id: string
  bank_account_id: string
  user_id: string
  role: 'RESPONSIBLE' | 'OPERATOR' | 'VIEWER'
  created_at?: string
}
