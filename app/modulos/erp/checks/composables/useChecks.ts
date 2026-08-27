import { computed } from 'vue'
import { useChecksStore } from '../store/checks.store'

import type {
  Check,
  CreateCheckInput,
  UpdateCheckInput
} from '~/modulos/erp/checks/types/checks.types'

export interface SelectItem {
  label: string
  value: string
}

export function useChecks() {
  const store = useChecksStore()

  // =========================
  // INIT
  // =========================

  const init = async (params?: {
    status?: string
    is_own?: boolean
    bank_name?: string
    due_before?: string
  }) => {
    await store.fetchAll(params)
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateCheckInput) => store.create(payload)

  const update = async (id: string, payload: UpdateCheckInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const clear = async (id: string) => store.clear(id)

  const bounce = async (id: string) => store.bounce(id)

  const confirm = async (id: string) => store.confirm(id)

  const reject = async (id: string) => store.reject(id)

  const deposit = async (id: string, data: { bank_account_id: string; amount?: number }) => store.deposit(id, data)

  const revert = async (id: string) => store.revert(id)

  // =========================
  // COMPUTED
  // =========================

  const pendingChecks = computed(() =>
    store.items.filter((c) => c.status === 'PENDING')
  )

  const ownChecks = computed(() =>
    store.items.filter((c) => c.is_own)
  )

  const thirdPartyChecks = computed(() =>
    store.items.filter((c) => !c.is_own)
  )

  const selectItems = computed<SelectItem[]>(() =>
    store.items.map((check) => ({
      label: `${check.check_number} - ${check.bank_name} ($${check.amount})`,
      value: check.id
    }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((c) => c.id === id)

  const getCheck = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    checks: computed(() => store.items),
    current: computed(() => store.current),
    upcoming: computed(() => store.upcoming),
    pendingNotification: computed(() => store.pendingNotification),
    loading: computed(() => store.loading),

    // computed
    pendingChecks,
    ownChecks,
    thirdPartyChecks,
    selectItems,

    // helpers
    findById,
    getCheck,

    // actions
    init,
    create,
    update,
    remove,
    clear,
    bounce,
    confirm,
    reject,
    deposit,
    revert,
    fetchUpcoming: store.fetchUpcoming,
    fetchPendingNotification: store.fetchPendingNotification
  }
}
