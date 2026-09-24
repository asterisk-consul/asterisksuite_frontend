import type { HrVale, HrAccount, HrAccountEntry, PartnerReport } from '../types/hr.types'

export const HrService = {
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VALES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getVales(params?: {
    party_id?: string
    party_type?: string
    status?: string
    type?: string
  }): Promise<HrVale[]> {
    return $fetch('/api/backend/hr/vales', { query: params })
  },

  async getVale(id: string): Promise<HrVale> {
    return $fetch(`/api/backend/hr/vales/${id}`)
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
    return $fetch('/api/backend/hr/vales', {
      method: 'POST' as any,
      body: dto,
    })
  },

  async confirmVale(id: string, treasury?: { treasury_target_type: 'CASH_BOX' | 'BANK_ACCOUNT'; treasury_target_id: string }): Promise<HrVale> {
    return $fetch(`/api/backend/hr/vales/${id}/confirm`, {
      method: 'PATCH' as any,
      body: treasury,
    })
  },

  async cancelVale(id: string): Promise<HrVale> {
    return $fetch(`/api/backend/hr/vales/${id}/cancel`, {
      method: 'PATCH' as any,
    })
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CUENTAS CORRIENTES RRHH
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getHrAccounts(params?: { party_type?: string }): Promise<HrAccount[]> {
    return $fetch('/api/backend/hr/accounts', { query: params })
  },

  async getHrAccountEntries(id: string): Promise<{ account: HrAccount; entries: HrAccountEntry[] }> {
    return $fetch(`/api/backend/hr/accounts/${id}/entries`)
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // REPORTE DE COMISIONES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getCommissionsReport(month: string, sellerId?: string): Promise<{
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
    return $fetch('/api/backend/hr/commissions', {
      query: { month, seller_id: sellerId },
    })
  },

  async generateCommissionVale(sellerId: string, month: string): Promise<any> {
    return $fetch('/api/backend/hr/commissions/vale', {
      method: 'POST' as any,
      body: { seller_id: sellerId, month },
    })
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // REPORTE DE SOCIO
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getPartnerReport(partyId: string): Promise<PartnerReport> {
    return $fetch(`/api/backend/hr/partner-report/${partyId}`)
  },
}
