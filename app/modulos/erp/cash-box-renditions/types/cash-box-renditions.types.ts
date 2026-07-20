export type RenditionStatus = 'pending' | 'approved' | 'rejected'

export interface CashBoxRendition {
  id: string
  cash_box_id: string
  rendition_number: number
  start_date: string
  end_date: string
  opening_balance: number
  total_expenses: number
  total_income: number
  closing_balance: number
  actual_balance?: number | null
  difference?: number | null
  status: RenditionStatus
  notes?: string | null
  approved_by?: string | null
  approved_at?: string | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateCashBoxRenditionInput {
  cash_box_id: string
  start_date: string
  end_date: string
  opening_balance: number
  closing_balance: number
  actual_balance?: number
  notes?: string
}

export interface ApproveRenditionInput {
  actual_balance?: number
  notes?: string
}
