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
}
