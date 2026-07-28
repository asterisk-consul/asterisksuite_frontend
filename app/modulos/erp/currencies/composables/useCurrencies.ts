import { computed } from 'vue'
import { useCurrenciesStore } from '../store/currencies.store'

import type {
  Currency,
  CreateCurrencyInput,
  UpdateCurrencyInput
} from '~/modulos/erp/currencies/types/currencies.types'

export interface SelectItem {
  label: string
  value: string
}

export function useCurrencies() {
  const store = useCurrenciesStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateCurrencyInput) => store.create(payload)

  const update = async (id: string, payload: UpdateCurrencyInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  // =========================
  // COMPUTED
  // =========================

  const selectItems = computed<SelectItem[]>(() =>
    store.activeItems.map((currency) => ({
      label: `${currency.symbol} ${currency.name}`,
      value: currency.id
    }))
  )

  const codeSelectItems = computed<SelectItem[]>(() =>
    store.activeItems.map((currency) => ({
      label: `${currency.symbol} ${currency.name}`,
      value: currency.code
    }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((c) => c.id === id)

  const getCurrency = async (id: string) => {
    const local = findById(id)

    if (local) return local

    return await store.fetchOne(id)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    currencies: computed(() => store.items),
    current: computed(() => store.current),
    baseCurrency: computed(() => store.baseCurrency),
    loading: computed(() => store.loading),

    // computed
    activeCurrencies: computed(() => store.activeItems),
    selectItems,
    codeSelectItems,

    // helpers
    findById,
    getCurrency,

    // actions
    init,
    create,
    update,
    remove,
    fetchBaseCurrency: store.fetchBaseCurrency
  }
}
