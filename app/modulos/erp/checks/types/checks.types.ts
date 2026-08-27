export type CheckStatus = 'PENDING' | 'CONFIRMED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'REJECTED'

export interface Check {
  id: string
  payment_id?: string | null
  bank_account_id?: string | null
  check_number: string
  bank_name: string
  bank_branch?: string | null
  account_number?: string | null
  issuer_name: string
  issuer_id?: string | null
  amount: number
  currency_code: string
  issue_date: string
  due_date: string
  status: CheckStatus
  is_own: boolean
  notes?: string | null

  payment_date?: string | null
  notification_sent: boolean
  confirmed_by?: string | null
  confirmed_at?: string | null

  deposit_date?: string | null
  clearing_date?: string | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null

  payment?: {
    id: string
    number: number
    type: string
    amount: number
    party_id?: string | null
    party_type?: string | null
    party?: { id: string; name: string; type: string } | null
  } | null

  bank_account?: {
    id: string
    name: string
    bank_name: string
    currency_code: string
  } | null
}

export interface CreateCheckInput {
  payment_id?: string
  bank_account_id?: string
  check_number: string
  bank_name: string
  bank_branch?: string
  account_number?: string
  issuer_name: string
  issuer_id?: string
  amount: number
  currency_code: string
  issue_date: string
  due_date: string
  is_own?: boolean
  notes?: string
  payment_date?: string
}

export interface UpdateCheckInput {
  bank_name?: string
  bank_account_id?: string
  bank_branch?: string
  account_number?: string
  issuer_name?: string
  issuer_id?: string
  due_date?: string
  status?: CheckStatus
  notes?: string
  payment_date?: string
  deposit_date?: string
  clearing_date?: string
}
