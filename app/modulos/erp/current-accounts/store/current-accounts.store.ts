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

  // =========================
  // FIND BY PARTY
  // =========================

  const fetchByParty = async (partyId: string) => {
    try {
      loading.value = true
      accounts.value = await service.findByParty(partyId)
      return accounts.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // ENTRIES
  // =========================

  const fetchEntries = async (partyId: string, currencyCode?: string) => {
    try {
      loading.value = true
      entries.value = await service.getEntries(partyId, currencyCode)
      return entries.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // STATEMENT
  // =========================

  const fetchStatement = async (partyId: string, currencyCode: string) => {
    try {
      loading.value = true
      statement.value = await service.getStatement(partyId, currencyCode)
      return statement.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // BALANCE
  // =========================

  const fetchBalance = async (partyId: string, currencyCode: string) => {
    try {
      loading.value = true
      const data = await service.getBalance(partyId, currencyCode)
      currentBalance.value = data.balance
      return data.balance
    } finally {
      loading.value = false
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
    try {
      loading.value = true
      activeAccounts.value = await service.findActive()
      return activeAccounts.value
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    accounts,
    entries,
    statement,
    currentBalance,
    activeAccounts,
    loading,

    // actions
    fetchByParty,
    fetchEntries,
    fetchStatement,
    fetchBalance,
    addEntry,
    fetchActive
  }
})
