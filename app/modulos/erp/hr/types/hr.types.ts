export type HrValeType = 'SUELDO' | 'ADELANTO' | 'EXTRAS' | 'RETIRO' | 'REEMBOLSO' | 'PRESTAMO' | 'APORTE'

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
  commission_details?: {
    id: string
    document_id: string
    seller_id: string | null
    subtotal: number
    commission_rate: number
    commission_amount: number
    date: string
    document?: { id: string; number: number; date: string }
  }[]
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
  SUELDO: 'Sueldo',
  ADELANTO: 'Adelanto',
  EXTRAS: 'Extras',
  RETIRO: 'Retiro',
  REEMBOLSO: 'Reembolso',
  PRESTAMO: 'Préstamo',
  APORTE: 'Aporte',
}

export const HR_VALE_TYPE_COLORS: Record<HrValeType, string> = {
  SUELDO: 'success',
  ADELANTO: 'warning',
  EXTRAS: 'info',
  RETIRO: 'error',
  REEMBOLSO: 'success',
  PRESTAMO: 'info',
  APORTE: 'primary',
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
