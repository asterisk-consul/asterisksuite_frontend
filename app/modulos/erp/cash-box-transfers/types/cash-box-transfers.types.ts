export type TransferType = 'CASH_TO_CASH' | 'CASH_TO_BANK' | 'BANK_TO_CASH' | 'BANK_TO_BANK'
export type TransferSourceType = 'cash_box' | 'bank_account'
export type TransferStatus = 'pending' | 'completed' | 'cancelled'

export interface TransferUser {
  id: string
  name?: string | null
  email?: string | null
}

export interface CashBoxTransfer {
  id: string
  session_id?: string | null
  source_type: TransferSourceType
  source_id: string
  dest_type: TransferSourceType
  dest_id: string
  amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string | null
  converted_amount?: number | null
  description?: string | null
  reference?: string | null
  transfer_type: TransferType
  status: TransferStatus
  creator?: TransferUser | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateCashBoxTransferInput {
  session_id?: string
  source_type: TransferSourceType
  source_id: string
  dest_type: TransferSourceType
  dest_id: string
  amount: number
  currency_code: string
  exchange_rate?: number
  rate_type?: string
  converted_amount?: number
  description?: string
  reference?: string
  transfer_type: TransferType
  date?: string
}
