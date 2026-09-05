export type CashBoxType = 'MAIN' | 'FIXED' | 'REGISTER'
export type CashBoxStatus = 'OPEN' | 'CLOSED'
export type CashBoxSessionStatus = 'OPEN' | 'CLOSED' | 'FORCED'
export type CashBoxUserRole = 'RESPONSIBLE' | 'OPERATOR' | 'VIEWER'

export interface CashBoxBalance {
  id: string
  cash_box_id: string
  currency_code: string
  balance: number
}

export interface CashBoxSession {
  id: string
  cash_box_id: string
  user_id: string
  opened_at: string
  opening_balance: number
  closed_at?: string | null
  closing_balance?: number | null
  actual_balance?: number | null
  difference?: number | null
  total_income: number
  total_expenses: number
  movement_count: number
  status: CashBoxSessionStatus
  force_closed: boolean
  force_closed_by?: string | null
  force_closed_at?: string | null
  force_close_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface CashBoxUserRole {
  id: string
  cash_box_id: string
  user_id: string
  role: 'RESPONSIBLE' | 'OPERATOR' | 'VIEWER'
}

export interface CashBox {
  id: string
  name: string
  type: CashBoxType
  currency_code?: string | null
  responsible_id?: string | null
  opening_balance: number
  max_limit?: number | null
  status: CashBoxStatus
  active: boolean
  is_main: boolean
  current_session_id?: string | null
  last_session_closed_at?: string | null
  balances?: CashBoxBalance[]
  current_session?: CashBoxSession | null
  user_roles?: CashBoxUserRole[]

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateCashBoxInput {
  name: string
  currency_code: string
  type?: CashBoxType
  responsible_id?: string
  opening_balance?: number
  max_limit?: number
  active?: boolean
  is_main?: boolean
}

export interface UpdateCashBoxInput extends Partial<CreateCashBoxInput> {}

export interface OpenSessionInput {
  opening_balance: number
  notes?: string
}

export interface CloseSessionInput {
  actual_balance: number
  notes?: string
}

export interface ForceCloseSessionInput {
  actual_balance: number
  reason: string
}
