export type TransferType = 'CASH_TO_CASH' | 'CASH_TO_BANK' | 'BANK_TO_CASH' | 'BANK_TO_BANK'
export type TransferSourceType = 'cash_box' | 'bank_account'
export type TransferStatus = 'pending' | 'processing' | 'debit_applied' | 'failed' | 'completed' | 'cancelled'

export interface TransferDestinationOptions {
  company: { id: string; name: string }
  cash_boxes: Array<{ id: string; name: string; currency_code: string; status: string; balances?: Array<{ currency_code: string; balance: number }> }>
  bank_accounts: Array<{ id: string; name: string; bank_name: string; currency_code: string; balance: number }>
}

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
  source_company_id?: string | null
  source_company_name?: string | null
  source_name?: string | null
  dest_type: TransferSourceType
  dest_id: string
  dest_company_id?: string | null
  dest_company_name?: string | null
  dest_name?: string | null
  amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string | null
  converted_amount?: number | null
  description?: string | null
  reference?: string | null
  transfer_type: TransferType
  status: TransferStatus
  record_side?: 'source' | 'destination'
  creator?: TransferUser | null
  execution_error?: string | null

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
  dest_company_id?: string
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
