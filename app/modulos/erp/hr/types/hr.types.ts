export type HrValeType = 'RETIRO' | 'ADELANTO' | 'REEMBOLSO' | 'PRESTAMO'

export type HrValeStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'

export interface HrVale {
  id: string
  number: number
  party_id: string
  party_type: string
  type: HrValeType
  amount: number
  currency_code: string
  status: HrValeStatus
  description: string | null
  date: string
  paid_at: string | null
  confirmed_at: string | null
  created_at: string
  party?: { id: string; name: string; tax_id: string | null }
}

export interface HrAccount {
  id: string
  party_id: string
  party_type: string
  currency_code: string
  balance: number
  active: boolean
  party?: { id: string; name: string; tax_id: string | null }
}

export interface HrAccountEntry {
  id: string
  hr_account_id: string
  type: string
  amount: number
  currency_code: string
  balance_before: number
  balance_after: number
  description: string | null
  reference_type: string | null
  reference_id: string | null
  date: string
  created_at: string
}

export const HR_VALE_TYPE_LABELS: Record<HrValeType, string> = {
  RETIRO: 'Retiro',
  ADELANTO: 'Adelanto',
  REEMBOLSO: 'Reembolso',
  PRESTAMO: 'Préstamo',
}

export const HR_VALE_TYPE_COLORS: Record<HrValeType, string> = {
  RETIRO: 'error',
  ADELANTO: 'warning',
  REEMBOLSO: 'success',
  PRESTAMO: 'info',
}

export const HR_VALE_STATUS_LABELS: Record<HrValeStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  PAID: 'Pagado',
  CANCELLED: 'Anulado',
}

export const HR_VALE_STATUS_COLORS: Record<HrValeStatus, string> = {
  DRAFT: 'neutral',
  CONFIRMED: 'warning',
  PAID: 'success',
  CANCELLED: 'error',
}
