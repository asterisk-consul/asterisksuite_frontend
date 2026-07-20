import { defineStore } from 'pinia'
import { ref } from 'vue'
import { HrService } from '../services/hr.service'
import type { HrVale, HrAccount, HrAccountEntry } from '../types/hr.types'

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

  const fetchVales = async (params?: {
    party_id?: string
    party_type?: string
    status?: string
    type?: string
  }) => {
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

  const confirmVale = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const updated = await HrService.confirmVale(id)
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
  }
})
