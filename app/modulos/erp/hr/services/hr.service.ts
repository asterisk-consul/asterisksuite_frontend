import type { HrVale, HrAccount, HrAccountEntry, PartnerReport } from '../types/hr.types'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export interface CommissionSeller {
  id: string
  name: string
  default_commission_rate: number
  commission_base: 'INVOICED' | 'PAID'
}

export interface CommissionAssignment {
  seller_id: string
  seller_name?: string
  participation_rate: number
  commission_rate: number
  commission_base: 'INVOICED' | 'PAID'
  accrued_amount?: number
  settled_amount?: number
  pending_amount?: number
}

export interface CommissionableDocument {
  document_id: string
  number: number
  date: string
  customer: string
  document_type: string
  subtotal: number
  total: number
  paid_amount: number
  paid_percentage: number
  currency_code: string
  assignment_status: 'ASSIGNED' | 'UNASSIGNED'
  assignments: CommissionAssignment[]
  commission_accrued: number
  commission_settled: number
  commission_pending: number
  commission_base_amount: number
  settled: boolean
  assignment_locked: boolean
  is_carryover: boolean
  has_unpaid_collection_commission: boolean
}

export const HrService = {
  async getPartnerReportOptions(): Promise<any[]> {
    return apiFetch<any[]>('/api/backend/hr/partner-report-options')
  },

  async getPartnerFunds(partyId: string, currencyCode: string): Promise<any> {
    return apiFetch<any>(`/api/backend/hr/partners/${partyId}/funds`, { query: { currency_code: currencyCode } })
  },
  // ══════════════════════════════════════════════════════════
  // VALES
  // ══════════════════════════════════════════════════════════

  async getVales(params?: {
    party_id?: string
    party_type?: string
    status?: string
    type?: string
  }): Promise<HrVale[]> {
    return apiFetch<HrVale[]>('/api/backend/hr/vales', { query: params })
  },

  async getVale(id: string): Promise<HrVale> {
    return apiFetch<HrVale>(`/api/backend/hr/vales/${id}`)
  },

  async createVale(dto: {
    party_id: string
    party_type: string
    type: string
    amount: number
    currency_code: string
    exchange_rate: number
    rate_type?: string
    converted_amount: number
    date: string
    description?: string
  }): Promise<HrVale> {
    return apiFetch<HrVale>('/api/backend/hr/vales', {
      method: 'POST' as any,
      body: dto
    })
  },

  async confirmVale(
    id: string,
    treasury?: { treasury_target_type: 'CASH_BOX' | 'BANK_ACCOUNT'; treasury_target_id: string }
  ): Promise<HrVale> {
    return apiFetch<HrVale>(`/api/backend/hr/vales/${id}/confirm`, {
      method: 'PATCH' as any,
      body: treasury
    })
  },

  async cancelVale(id: string): Promise<HrVale> {
    return apiFetch<HrVale>(`/api/backend/hr/vales/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  // ══════════════════════════════════════════════════════════
  // CUENTAS CORRIENTES RRHH
  // ══════════════════════════════════════════════════════════

  async getHrAccounts(params?: { party_type?: string }): Promise<HrAccount[]> {
    return apiFetch<HrAccount[]>('/api/backend/hr/accounts', { query: params })
  },

  async getHrAccountEntries(id: string): Promise<{ account: HrAccount; entries: HrAccountEntry[] }> {
    return apiFetch<{ account: HrAccount; entries: HrAccountEntry[] }>(`/api/backend/hr/accounts/${id}/entries`)
  },

  // ══════════════════════════════════════════════════════════
  // REPORTE DE COMISIONES
  // ══════════════════════════════════════════════════════════

  async getCommissionsReport(
    month: string,
    sellerId?: string
  ): Promise<{
    month: string
    sellers: {
      seller_id: string
      seller_name: string
      party_id: string | null
      total_ventas: number
      total_comisiones: number
      cantidad_ov: number
      items: {
        document_id: string
        ov_number: number
        subtotal: number
        sold_subtotal: number
        settled_amount: number
        commission_rate: number
        commission_amount: number
        commission_base: 'INVOICED' | 'PAID'
        date: string
      }[]
    }[]
    total_ventas: number
    total_comisiones: number
    cantidad_ov: number
  }> {
    return apiFetch<any>('/api/backend/hr/commissions', {
      query: { month, seller_id: sellerId }
    })
  },

  async generateCommissionVale(sellerId: string, month: string): Promise<any> {
    return apiFetch<any>('/api/backend/hr/commissions/vale', {
      method: 'POST' as any,
      body: { seller_id: sellerId, month }
    })
  },

  async getCommissionableDocuments(month: string): Promise<CommissionableDocument[]> {
    return apiFetch<CommissionableDocument[]>('/api/backend/hr/commissions/documents', { query: { month } })
  },

  async getCommissionSellers(): Promise<CommissionSeller[]> {
    return apiFetch<CommissionSeller[]>('/api/backend/hr/commissions/sellers')
  },

  async saveCommissionAssignments(documentId: string, assignments: CommissionAssignment[]) {
    return apiFetch<any>(`/api/backend/hr/commissions/documents/${documentId}/assignments`, {
      method: 'PATCH' as any,
      body: { assignments }
    })
  },

  // ══════════════════════════════════════════════════════════
  // REPORTE DE SOCIO
  // ══════════════════════════════════════════════════════════

  async getPartnerReport(partyId: string): Promise<PartnerReport> {
    return apiFetch<PartnerReport>(`/api/backend/hr/partner-report/${partyId}`)
  }
}
