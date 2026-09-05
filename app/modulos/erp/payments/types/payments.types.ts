export type PaymentType = 'PAYMENT' | 'COLLECTION'

export type PaymentMode = 'NORMAL' | 'ADVANCE'

export type PaymentMethod =
  | 'CASH'
  | 'CHECK'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'VIRTUAL_WALLET'

export type PaymentStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'REVERSED' | 'CANCELLED'

export interface PaymentDocument {
  id: string
  payment_id: string
  document_id: string
  amount_applied: number
  document?: {
    id: string
    number: number
    total: number
    paid_amount: number
    party_id: string | null
    date: string
    currency_code: string
    business_parties?: { id: string; name: string } | null
    document_types?: { id: string; code: string; description: string; category: string } | null
  }
}

export interface Payment {
  id: string
  number: number
  type: PaymentType
  date: string
  party_id?: string | null
  party_type?: string | null
  payment_method: PaymentMethod
  amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string | null
  converted_amount?: number | null
  exchange_note?: string | null
  description?: string | null
  reference?: string | null
  bank_account_id?: string | null
  cash_box_id?: string | null
  account_id?: string | null
  account?: { id: string; code: string; name: string; account_type: string } | null
  bank_account?: {
    id: string; name: string; bank_name: string; account_number?: string | null
    cbu?: string | null; alias?: string | null; currency_code: string
  } | null
  cash_box?: { id: string; name: string; type: string; currency_code?: string | null } | null
  payment_allocations?: Array<{
    amount_applied: number
    check: {
      id: string; check_number: string; bank_name?: string | null; issuer_name?: string | null
      amount: number; currency_code: string; due_date?: string | null; is_own: boolean
    }
  }>
  check_ids?: string[]
  status: PaymentStatus
  payment_mode?: PaymentMode

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  created_by?: string | null
  confirmed_at?: string | null
  confirmed_by?: string | null
  payment_date?: string | null
  creator?: { name: string; email: string } | null

  documents?: PaymentDocument[]
}

export interface CreatePaymentDocumentInput {
  document_id: string
  amount_applied: number
}

export interface CreatePaymentInput {
  type: PaymentType
  payment_mode?: PaymentMode
  date: string
  party_id?: string
  party_type?: string
  payment_method: PaymentMethod
  amount: number
  currency_code: string
  exchange_rate?: number
  rate_type?: string
  converted_amount?: number
  exchange_note?: string
  description?: string
  reference?: string
  bank_account_id?: string
  cash_box_id?: string
  account_id?: string
  check_ids?: string[]
  documents?: CreatePaymentDocumentInput[]
  status?: PaymentStatus
}

export interface UpdatePaymentInput extends Partial<Omit<CreatePaymentInput, 'type'>> {}

export interface ApplyAdvanceInput {
  document_id: string
  amount: number
}

export interface AdvanceAvailable {
  id: string
  number: number
  date: string
  amount: number
  available: number
  currency_code: string
  party_id: string | null
  party_name: string | null
}
