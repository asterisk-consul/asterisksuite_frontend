import { defineStore } from 'pinia'
import { ref } from 'vue'
import { HrService } from '../services/hr.service'
import type { HrVale, HrAccount, HrAccountEntry, PartnerReport } from '../types/hr.types'

export interface CommissionReport {
  month: string
  sellers: {
    seller_id: string
    seller_type: 'EMPLOYEE' | 'PARTNER'
    seller_name: string
    party_id: string | null
    currency_code: string
    total_ventas: number
    total_comisiones: number
    total_participacion: number
    total_pendiente: number
    cantidad_ov: number
    items: {
      kind: 'COMMISSION' | 'PARTNER_SHARE'
      document_id: string
      ov_number: number
      subtotal: number
      sold_subtotal: number
      settled_amount: number
      commission_rate?: number
      share_percentage?: number
      commission_amount: number
      commission_base: 'INVOICED' | 'PAID' | 'ORDER'
      participation_rate: number
      date: string
    }[]
  }[]
  totals_by_currency: {
    currency_code: string
    total_ventas: number
    total_comisiones: number
    total_participacion: number
    total_pendiente: number
    cantidad_ov: number
  }[]
  total_ventas: number
  total_comisiones: number
  total_participacion: number
  total_pendiente: number
  cantidad_ov: number
}

export const useHrStore = defineStore('hr', () => {
  const vales = ref<HrVale[]>([])
  const accounts = ref<HrAccount[]>([])
  const currentEntries = ref<HrAccountEntry[]>([])
  const currentAccount = ref<HrAccount | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ══════════════════════════════════════════════════════════
  // VALES
  // ══════════════════════════════════════════════════════════

  const fetchVales = async (params?: { party_id?: string; party_type?: string; status?: string; type?: string }) => {
    loading.value = true
    error.value = null
    try {
      vales.value = await HrService.getVales(params)
      return vales.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar vales'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createVale = async (dto: {
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
  }) => {
    loading.value = true
    error.value = null
    try {
      const vale = await HrService.createVale(dto)
      vales.value.unshift(vale)
      return vale
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear vale'
      throw err
    } finally {
      loading.value = false
    }
  }

  const confirmVale = async (
    id: string,
    treasury?: {
      treasury_target_type: 'CASH_BOX' | 'BANK_ACCOUNT'
      treasury_target_id?: string
      treasury_target_company_id?: string
      treasury_target_external_id?: string
    }
  ) => {
    loading.value = true
    error.value = null
    try {
      const updated = await HrService.confirmVale(id, treasury)
      const index = vales.value.findIndex((v) => v.id === id)
      if (index !== -1) vales.value[index] = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al confirmar vale'
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelVale = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const updated = await HrService.cancelVale(id)
      const index = vales.value.findIndex((v) => v.id === id)
      if (index !== -1) vales.value[index] = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al anular vale'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ══════════════════════════════════════════════════════════
  // CUENTAS CORRIENTES RRHH
  // ══════════════════════════════════════════════════════════

  const fetchAccounts = async (params?: { party_type?: string }) => {
    loading.value = true
    error.value = null
    try {
      accounts.value = await HrService.getHrAccounts(params)
      return accounts.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar cuentas'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAccountEntries = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const result = await HrService.getHrAccountEntries(id)
      currentAccount.value = result.account
      currentEntries.value = result.entries
      return result
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar movimientos'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ══════════════════════════════════════════════════════════
  // REPORTE DE COMISIONES
  // ══════════════════════════════════════════════════════════

  const fetchCommissionsReport = async (month: string, sellerId?: string, sellerType: 'EMPLOYEE' | 'PARTNER' = 'EMPLOYEE') => {
    loading.value = true
    error.value = null
    try {
      const report = await HrService.getCommissionsReport(month, sellerId, sellerType)
      return report
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar reporte de comisiones'
      throw err
    } finally {
      loading.value = false
    }
  }

  const generateCommissionVale = async (sellerId: string, month: string, sellerType: 'EMPLOYEE' | 'PARTNER' = 'EMPLOYEE') => {
    loading.value = true
    error.value = null
    try {
      const vale = await HrService.generateCommissionVale(sellerId, month, sellerType)
      return vale
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al generar vale de comisiones'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ══════════════════════════════════════════════════════════
  // REPORTE DE SOCIO
  // ══════════════════════════════════════════════════════════

  const fetchPartnerReport = async (partyId: string): Promise<PartnerReport> => {
    loading.value = true
    error.value = null
    try {
      return await HrService.getPartnerReport(partyId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar reporte de socio'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    vales,
    accounts,
    currentEntries,
    currentAccount,
    loading,
    error,
    fetchVales,
    createVale,
    confirmVale,
    cancelVale,
    fetchAccounts,
    fetchAccountEntries,
    fetchCommissionsReport,
    generateCommissionVale,
    fetchPartnerReport
  }
})
