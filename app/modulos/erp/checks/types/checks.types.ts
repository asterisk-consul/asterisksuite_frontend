export type CheckStatus = 'PENDING' | 'CONFIRMED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'REJECTED'

export interface CheckRelatedPayment {
  id: string
  number: number
  type: string
  status: string
  deleted_at?: string | null
  amount: number
  party_id?: string | null
  party_type?: string | null
  party?: { id: string; name: string; type: string } | null
}

export interface Check {
  id: string
  check_format?: 'PAPER' | 'ECHEQ'
  payment_id?: string | null
  bank_account_id?: string | null
  bank_account_company_id?: string | null
  bank_account_external_id?: string | null
  bank_concept_id?: string | null
  bank_concept_external_id?: string | null
  check_number: string
  bank_name: string
  bank_branch?: string | null
  account_number?: string | null
  issuer_name: string
  issuer_id?: string | null
  amount: number
  available_amount?: number | null
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

  payment?: CheckRelatedPayment | null
  payment_allocations?: Array<{
    amount_applied: number
    payment?: CheckRelatedPayment | null
  }>

  bank_account?: {
    id: string
    name: string
    bank_name: string
    currency_code: string
  } | null
  bank_concept?: {
    id: string
    code: string
    name: string
    nature: string
  } | null
}

export interface CheckNotificationAlertPreview {
  id: string
  check_number: string
  bank_name: string
  due_date: string
  is_own: boolean
}

export interface CheckNotificationAlertGroup {
  count: number
  checks: CheckNotificationAlertPreview[]
  days?: number
}

export interface CheckNotificationAlerts {
  third_party: CheckNotificationAlertGroup
  own: CheckNotificationAlertGroup
  upcoming: CheckNotificationAlertGroup
}

export interface CreateCheckInput {
  check_format?: 'PAPER' | 'ECHEQ'
  payment_id?: string
  bank_account_id?: string
  bank_account_company_id?: string
  bank_account_external_id?: string
  bank_concept_id?: string
  bank_concept_external_id?: string
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
  check_format?: 'PAPER' | 'ECHEQ'
  check_number?: string
  amount?: number
  currency_code?: string
  issue_date?: string
  bank_name?: string
  bank_account_id?: string | null
  bank_account_company_id?: string | null
  bank_account_external_id?: string | null
  bank_concept_id?: string | null
  bank_concept_external_id?: string | null
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
