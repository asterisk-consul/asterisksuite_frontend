import { computed } from 'vue'
import { useBankAccountsStore } from '../store/bank-accounts.store'

import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

export interface SelectItem {
  label: string
  value: string
}

export function useBankAccounts() {
  const store = useBankAccountsStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateBankAccountInput) => store.create(payload)

  const update = async (id: string, payload: UpdateBankAccountInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const fetchMovements = async (id: string) => store.fetchMovements(id)

  // =========================
  // COMPUTED
  // =========================

  const selectItems = computed<SelectItem[]>(() =>
    store.activeItems.map((account) => ({
      label: `${account.bank_name} - ${account.name}`,
      value: account.id
    }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((a) => a.id === id)

  const getBankAccount = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    bankAccounts: computed(() => store.items),
    current: computed(() => store.current),
    movements: computed(() => store.movements),
    loading: computed(() => store.loading),

    // computed
    activeBankAccounts: computed(() => store.activeItems),
    selectItems,

    // helpers
    findById,
    getBankAccount,

    // actions
    init,
    create,
    update,
    remove,
    fetchMovements,
    fetchOne: store.fetchOne
  }
}
