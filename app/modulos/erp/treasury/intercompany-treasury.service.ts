export type IntercompanyFundType = 'CASH_BOX' | 'BANK_ACCOUNT'
export type IntercompanyUse = 'PAYMENT' | 'COLLECTION' | 'HR'

export interface IntercompanyFundOption {
  id: string
  fund_id: string
  fund_type: IntercompanyFundType
  company_id: string
  company_name: string
  is_intercompany: true
  name: string
  currency_code: string
  status?: string
  current_session_id?: string | null
  balances?: Array<{ currency_code: string; balance: number | string }>
  balance?: number | string
  bank_name?: string
  account_number?: string | null
  account_type?: string
}

export interface IntercompanySummary {
  company_id: string
  company_name: string
  currency_code: string
  balance: number
  collected_here_for_other: number
  collected_there_for_us: number
  paid_here_for_other: number
  paid_there_for_us: number
  transferred_out: number
  transferred_in: number
}

export interface IntercompanyMovement {
  id: string
  kind: 'FONDO_COMPARTIDO' | 'TRANSFERENCIA'
  source_type: string
  source_id: string
  company_id: string | null
  company_name: string
  fund_type: string
  currency_code: string
  amount: number
  converted_amount?: number | null
  balance_effect: number
  description: string
  date: string
  status: string
  purpose: 'SETTLEMENT' | 'OTHER' | null
  can_classify?: boolean
}

export interface IntercompanyOverview {
  summaries: IntercompanySummary[]
  movements: IntercompanyMovement[]
}

const baseUrl = '/api/backend/erp/treasury/intercompany'

export const useIntercompanyTreasuryService = () => ({
  availability: () => $fetch<{ enabled: boolean }>(`${baseUrl}/overview/availability`),
  overview: () => $fetch<IntercompanyOverview>(`${baseUrl}/overview`),
  findCompanies: (type: IntercompanyFundType) => $fetch<Array<{ id: string; name: string; subdomain: string }>>(`${baseUrl}/${type === 'CASH_BOX' ? 'cash-boxes' : 'bank-accounts'}/companies`),
  findAvailable: (use: IntercompanyUse, currencyCode?: string) => $fetch<IntercompanyFundOption[]>(`${baseUrl}/available/${use === 'HR' ? 'hr' : 'payments'}`, {
    query: { ...(use === 'HR' ? {} : { use }), ...(currencyCode ? { currency_code: currencyCode } : {}) },
  }),
  findShares: (type: IntercompanyFundType, fundId: string) => $fetch<any[]>(`${baseUrl}/${type === 'CASH_BOX' ? 'cash-boxes' : 'bank-accounts'}/${fundId}/shares`),
  saveShares: (type: IntercompanyFundType, fundId: string, shares: any[]) => $fetch<any[]>(`${baseUrl}/${type === 'CASH_BOX' ? 'cash-boxes' : 'bank-accounts'}/${fundId}/shares`, {
    method: 'POST',
    body: { shares },
  }),
})
