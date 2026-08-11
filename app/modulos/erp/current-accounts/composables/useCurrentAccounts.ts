import { computed } from 'vue'
import { useCurrentAccountsStore } from '../store/current-accounts.store'

import type {
  CurrentAccountEntry,
  CreateCurrentAccountEntryInput
} from '~/modulos/erp/current-accounts/types/current-accounts.types'

export function useCurrentAccounts() {
  const store = useCurrentAccountsStore()

  // =========================
  // ACTIONS
  // =========================

  const fetchByParty = async (partyId: string) => store.fetchByParty(partyId)

  const fetchEntries = async (partyId: string) =>
    store.fetchEntries(partyId)

  const fetchStatement = async (partyId: string) =>
    store.fetchStatement(partyId)

  const fetchBalance = async (partyId: string) =>
    store.fetchBalance(partyId)

  const addEntry = async (payload: CreateCurrentAccountEntryInput) => store.addEntry(payload)

  const fetchActive = async () => store.fetchActive()

  const fetchAll = async (params?: { party_type?: string; balance_filter?: string }) =>
    store.fetchAll(params)

  // =========================
  // RETURN
  // =========================

  return {
    // state
    accounts: computed(() => store.accounts),
    entries: computed(() => store.entries),
    statement: computed(() => store.statement),
    currentBalance: computed(() => store.currentBalance),
    activeAccounts: computed(() => store.activeAccounts),
    allAccounts: computed(() => store.allAccounts),
    loading: computed(() => store.loading),

    // actions
    fetchByParty,
    fetchEntries,
    fetchStatement,
    fetchBalance,
    addEntry,
    fetchActive,
    fetchAll
  }
}
