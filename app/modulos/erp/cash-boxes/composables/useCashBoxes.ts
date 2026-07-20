import { computed } from 'vue'
import { useCashBoxesStore } from '../store/cash-boxes.store'

import type {
  CashBox,
  CreateCashBoxInput,
  UpdateCashBoxInput,
  OpenSessionInput,
  CloseSessionInput,
  ForceCloseSessionInput
} from '~/modulos/erp/cash-boxes/types/cash-boxes.types'

export interface SelectItem {
  label: string
  value: string
}

export function useCashBoxes() {
  const store = useCashBoxesStore()

  const init = async () => {
    await store.fetchAll()
  }

  const create = async (payload: CreateCashBoxInput) => store.create(payload)

  const update = async (id: string, payload: UpdateCashBoxInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const openSession = async (id: string, payload: OpenSessionInput) =>
    store.openSession(id, payload)

  const closeSession = async (id: string, payload: CloseSessionInput) =>
    store.closeSession(id, payload)

  const forceCloseSession = async (id: string, payload: ForceCloseSessionInput) =>
    store.forceCloseSession(id, payload)

  const selectItems = computed<SelectItem[]>(() =>
    store.activeItems.map((box) => ({
      label: `${box.name} (${box.status})`,
      value: box.id
    }))
  )

  const findById = (id: string) => store.items.find((b) => b.id === id)

  const getCashBox = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  return {
    // state
    cashBoxes: computed(() => store.items),
    current: computed(() => store.current),
    mainBox: computed(() => store.mainBox),
    balances: computed(() => store.balances),
    currentSession: computed(() => store.currentSession),
    sessions: computed(() => store.sessions),
    loading: computed(() => store.loading),

    // computed
    activeCashBoxes: computed(() => store.activeItems),
    openBoxes: computed(() => store.openBoxes),
    selectItems,

    // helpers
    findById,
    getCashBox,

    // actions
    init,
    create,
    update,
    remove,
    fetchOne: store.fetchOne,
    fetchMain: store.fetchMain,
    fetchBalances: store.fetchBalances,
    fetchCurrentSession: store.fetchCurrentSession,
    fetchSessions: store.fetchSessions,
    openSession,
    closeSession,
    forceCloseSession,
    addUserRole: store.addUserRole,
    removeUserRole: store.removeUserRole,
    reset: store.reset
  }
}
