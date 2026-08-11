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
