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

  const fetchEntries = async (partyId: string, currencyCode?: string) =>
    store.fetchEntries(partyId, currencyCode)

  const fetchStatement = async (partyId: string, currencyCode: string) =>
    store.fetchStatement(partyId, currencyCode)

  const fetchBalance = async (partyId: string, currencyCode: string) =>
    store.fetchBalance(partyId, currencyCode)

  const addEntry = async (payload: CreateCurrentAccountEntryInput) => store.addEntry(payload)

  const fetchActive = async () => store.fetchActive()

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
    loading: computed(() => store.loading),

    // actions
    fetchByParty,
    fetchEntries,
    fetchStatement,
    fetchBalance,
    addEntry,
    fetchActive
  }
}
