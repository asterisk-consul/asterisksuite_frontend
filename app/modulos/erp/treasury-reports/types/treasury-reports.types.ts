export interface TreasuryDashboard {
  bank_accounts: {
    id: string
    name: string
    bank_name: string
    currency_code: string
    balance: number
  }[]
  cash_boxes: {
    id: string
    name: string
    currency_code: string
    balance: number
  }[]
  pending_checks: {
    count: number
    total_amount: number
    currency_code: string
  }[]
  payment_totals: {
    total_payments: number
    total_collections: number
    currency_code: string
  }[]
  summary: {
    total_bank_balance: number
    pending_own_checks: number
    pending_third_party_checks: number
    total_payments: number
    total_payments_count: number
    total_collections: number
    total_collections_count: number
  }
}

export type TreasuryPendingKind = 'advances' | 'drafts' | 'obligations' | 'transfers'
export interface TreasuryPendingItem {
  id: string
  label: string
  detail: string
  date: string
  amount: number
  currency_code: string
  kind: string
  estimated: boolean
}
export interface TreasuryPendingGroup {
  count: number
  estimated_count: number
  totals: Array<{ currency_code: string; amount: number }>
  items: TreasuryPendingItem[]
}
export type TreasuryPending = Record<TreasuryPendingKind, TreasuryPendingGroup | null>

export interface TreasuryMovement {
  id: string
  source: 'bank' | 'cash_box' | 'payment'
  source_name: string
  type: string
  amount: number
  currency_code: string
  description?: string | null
  user_name?: string | null
  date: string
  created_at?: string
}

export interface TreasuryMovementsQuery {
  type?: string
  date_from?: string
  date_to?: string
  limit?: number
}
