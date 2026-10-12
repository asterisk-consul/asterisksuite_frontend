export type InvestmentType = 'FIXED_TERM' | 'INVESTMENT_FUND' | 'OTHER'
export type InvestmentStatus = 'ACTIVE' | 'MATURED_PENDING_SETTLEMENT' | 'REDEMPTION_REQUESTED' | 'REDEEMED' | 'RENEWED' | 'CANCELLED'

export interface FinancialInvestment {
  id: string
  type: InvestmentType
  status: InvestmentStatus
  display_status?: InvestmentStatus
  name: string
  institution_name?: string | null
  currency_code: string
  source_bank_account_id: string
  destination_bank_account_id?: string | null
  capital_amount: number
  start_date: string
  maturity_date?: string | null
  annual_nominal_rate?: number | null
  liquidity_type?: 'NON_CANCELABLE' | 'PRE_CANCELABLE' | null
  early_cancel_available_from?: string | null
  early_cancel_annual_rate?: number | null
  can_early_cancel?: boolean
  early_cancel_value?: number | null
  day_count_basis?: number | null
  units?: number | null
  initial_unit_value?: number | null
  current_unit_value?: number | null
  current_unit_value_date?: string | null
  expected_final_amount?: number | null
  current_value: number
  accrued_return: number
  projected_return?: number | null
  realized_return: number
  days_remaining?: number | null
  source_bank_account?: any
  destination_bank_account?: any
  valuations?: any[]
  transactions?: any[]
}

// Se conserva el prefijo ERP explícito para que funcione incluso si el proxy
// todavía no recargó su mapa de rutas durante HMR.
const base = '/api/backend/erp/financial-investments'
export const useFinancialInvestmentsService = () => ({
  findAll: (query?: Record<string, string>) => $fetch<FinancialInvestment[]>(base, { query }),
  summary: () => $fetch<any>(`${base}/summary`),
  findOne: (id: string) => $fetch<FinancialInvestment>(`${base}/${id}`),
  create: (body: any) => $fetch<FinancialInvestment>(base, { method: 'POST', body }),
  addValuation: (id: string, body: any) => $fetch<FinancialInvestment>(`${base}/${id}/valuations`, { method: 'POST', body }),
  settle: (id: string, body: any) => $fetch<FinancialInvestment>(`${base}/${id}/settle`, { method: 'POST', body }),
  redeem: (id: string, body: any) => $fetch<FinancialInvestment>(`${base}/${id}/redeem`, { method: 'POST', body })
})
