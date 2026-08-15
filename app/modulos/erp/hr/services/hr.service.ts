import type { HrVale, HrAccount, HrAccountEntry } from '../types/hr.types'

export const HrService = {
  // ══════════════════════════════════════════════════════════
  // VALES
  // ══════════════════════════════════════════════════════════

  async getVales(params?: {
    party_id?: string
    party_type?: string
    status?: string
    type?: string
  }): Promise<HrVale[]> {
    return $fetch('/api/erp/hr/vales', { query: params })
  },

  async getVale(id: string): Promise<HrVale> {
    return $fetch(`/api/erp/hr/vales/${id}`)
  },

  async createVale(dto: {
    party_id: string
    party_type: string
    type: string
    amount: number
    currency_code: string
    date: string
    description?: string
  }): Promise<HrVale> {
    return $fetch('/api/erp/hr/vales', {
      method: 'POST' as any,
      body: dto,
    })
  },

  async confirmVale(id: string): Promise<HrVale> {
    return $fetch(`/api/erp/hr/vales/${id}/confirm`, {
      method: 'PATCH' as any,
    })
  },

  async cancelVale(id: string): Promise<HrVale> {
    return $fetch(`/api/erp/hr/vales/${id}/cancel`, {
      method: 'PATCH' as any,
    })
  },

  // ══════════════════════════════════════════════════════════
  // CUENTAS CORRIENTES RRHH
  // ══════════════════════════════════════════════════════════

  async getHrAccounts(params?: { party_type?: string }): Promise<HrAccount[]> {
    return $fetch('/api/erp/hr/accounts', { query: params })
  },

  async getHrAccountEntries(id: string): Promise<{ account: HrAccount; entries: HrAccountEntry[] }> {
    return $fetch(`/api/erp/hr/accounts/${id}/entries`)
  },

  // ══════════════════════════════════════════════════════════
  // REPORTE DE COMISIONES
  // ══════════════════════════════════════════════════════════

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
        commission_rate: number
        commission_amount: number
        date: string
      }[]
    }[]
    total_ventas: number
    total_comisiones: number
    cantidad_ov: number
  }> {
    return $fetch('/api/erp/hr/commissions', {
      query: { month, seller_id: sellerId },
    })
  },

  async generateCommissionVale(sellerId: string, month: string): Promise<any> {
    return $fetch('/api/erp/hr/commissions/vale', {
      method: 'POST' as any,
      body: { seller_id: sellerId, month },
    })
  },
}
