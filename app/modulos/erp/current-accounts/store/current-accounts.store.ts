import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCurrentAccountsService } from '~/modulos/erp/current-accounts/service/current-accounts.service'

import type {
  CurrentAccount,
  CurrentAccountEntry,
  CreateCurrentAccountEntryInput,
  CurrentAccountStatement
} from '~/modulos/erp/current-accounts/types/current-accounts.types'

export const useCurrentAccountsStore = defineStore('current-accounts', () => {
  const service = useCurrentAccountsService()

  const accounts = ref<CurrentAccount[]>([])
  const entries = ref<CurrentAccountEntry[]>([])
  const statement = ref<CurrentAccountStatement | null>(null)
  const currentBalance = ref<number | null>(null)

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    accounts.value = []
    entries.value = []
    statement.value = null
    currentBalance.value = null
    activeAccounts.value = []
    allAccounts.value = []
    loading.value = false
  }

  // =========================
  // FIND BY PARTY
  // =========================

  const fetchByParty = async (partyId: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findByParty(partyId)
      if (generation === requestGeneration) accounts.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // ENTRIES
  // =========================

  const fetchEntries = async (partyId: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.getEntries(partyId)
      if (generation === requestGeneration) entries.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // STATEMENT
  // =========================

  const fetchStatement = async (partyId: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.getStatement(partyId)
      if (generation === requestGeneration) statement.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // BALANCE
  // =========================

  const fetchBalance = async (partyId: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.getBalance(partyId)
      if (generation === requestGeneration) currentBalance.value = data.balance
      return data.balance
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // ADD ENTRY
  // =========================

  const addEntry = async (payload: CreateCurrentAccountEntryInput) => {
    const created = await service.addEntry(payload)
    entries.value.unshift(created)
    return created
  }

  // =========================
  // ACTIVE (balance != 0)
  // =========================

  const activeAccounts = ref<CurrentAccount[]>([])

  const fetchActive = async () => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findActive()
      if (generation === requestGeneration) activeAccounts.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // ALL (with filters)
  // =========================

  const allAccounts = ref<CurrentAccount[]>([])

  const fetchAll = async (params?: { party_type?: string; balance_filter?: string }) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findAll(params)
      if (generation === requestGeneration) allAccounts.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  return {
    // state
    accounts,
    entries,
    statement,
    currentBalance,
    activeAccounts,
    allAccounts,
    loading,

    // actions
    fetchByParty,
    fetchEntries,
    fetchStatement,
    fetchBalance,
    addEntry,
    fetchActive,
    fetchAll,
    reset
  }
})
