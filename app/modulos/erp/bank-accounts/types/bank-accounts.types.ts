export interface BankAccount {
  id: string
  name: string
  bank_name: string
  account_type: string
  cbu?: string | null
  alias?: string | null
  account_number?: string | null
  currency_code: string
  balance: number
  active: boolean
  can_set_initial_balance?: boolean
  pending_checks_count?: number

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface BankAccountMovement {
  id: string
  bank_account_id: string
  bank_operation_id?: string | null
  type: string
  nature?: 'DEBIT' | 'CREDIT' | null
  amount: number
  base_amount?: number | null
  tax_amount?: number | null
  total_amount?: number | null
  currency_code: string
  exchange_rate?: number | null
  balance_before: number
  balance_after: number
  description?: string | null
  reference?: string | null
  reference_type?: string | null
  reference_id?: string | null
  bank_concept_id?: string | null
  concept_code_snapshot?: string | null
  concept_name_snapshot?: string | null
  payment_id?: string | null
  card_settlement_id?: string | null
  date: string
  document_date?: string | null
  effective_date?: string | null
  attachment_file_id?: string | null

  bank_concept?: {
    id: string
    code: string
    name: string
    nature: 'DEBIT' | 'CREDIT'
    concept_type: string
  } | null
  operation?: {
    id: string
    operation_type: string
    source_type?: string | null
    source_id?: string | null
    gross_amount: number
    charges_amount: number
    retentions_amount: number
    net_amount: number
  } | null

  created_at?: string
  updated_at?: string
}

export interface CreateBankMovementInput {
  nature: 'DEBIT' | 'CREDIT'
  bank_concept_id: string
  amount: number
  base_amount?: number
  tax_amount?: number
  total_amount?: number
  currency_code?: string
  exchange_rate?: number
  rate_type?: string
  reference?: string
  description?: string
  attachment_file_id?: string
  date?: string
  document_date?: string
  effective_date?: string
}

export interface CreateBankAccountInput {
  name: string
  bank_name: string
  account_type: string
  cbu?: string
  alias?: string
  account_number?: string
  currency_code: string
  balance?: number
  active?: boolean
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {}

export type BankAccountDeleteMode = 'TRANSFER' | 'DISCARD'

export interface DeleteBankAccountInput {
  confirmation: string
  mode?: BankAccountDeleteMode
  delete_movements?: boolean
  target_bank_account_id?: string
}

export interface BankAccountUserRole {
  id: string
  bank_account_id: string
  user_id: string
  role: 'RESPONSIBLE' | 'OPERATOR' | 'VIEWER'
  created_at?: string
}

export type BankChargeRuleTrigger = 'BANK_PAYMENT' | 'BANK_COLLECTION' | 'CARD_SETTLEMENT' | 'CHECK_DEPOSIT' | 'CHECK_REJECTION' | 'INVESTMENT_REDEMPTION' | 'FIXED_TERM_EARLY_CANCEL'
export type BankChargeCalculationType = 'FIXED' | 'PERCENTAGE' | 'FIXED_PLUS_PERCENTAGE'

export interface BankChargeRuleInput {
  bank_concept_id: string
  name: string
  trigger: BankChargeRuleTrigger
  calculation_type: BankChargeCalculationType
  fixed_amount?: number
  percentage?: number | null
  minimum_amount?: number | null
  maximum_amount?: number | null
  currency_code?: string | null
  valid_from?: string | null
  valid_until?: string | null
  priority?: number
  editable?: boolean
  active?: boolean
}

export interface BankChargeRule extends BankChargeRuleInput {
  id: string
  bank_account_id: string
  bank_concept?: { id: string; code: string; name: string; nature: 'DEBIT' | 'CREDIT'; calculates_iva?: boolean; iva_rate?: number | null }
}

export interface SuggestedBankCharge {
  rule_id: string
  rule_name: string
  editable: boolean
  bank_concept_id: string
  concept_code: string
  concept_name: string
  nature: 'DEBIT' | 'CREDIT'
  base_amount: number
  percentage: number | null
  charge_amount: number
  tax_amount: number
  total_amount: number
}
