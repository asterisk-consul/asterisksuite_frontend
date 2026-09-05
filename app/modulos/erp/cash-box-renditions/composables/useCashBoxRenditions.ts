import { computed } from 'vue'
import { useCashBoxRenditionsStore } from '../store/cash-box-renditions.store'

import type {
  CashBoxRendition,
  CreateCashBoxRenditionInput,
  ApproveRenditionInput
} from '~/modulos/erp/cash-box-renditions/types/cash-box-renditions.types'

export function useCashBoxRenditions() {
  const store = useCashBoxRenditionsStore()

  const init = async (params?: { cash_box_id?: string }) => {
    await store.fetchAll(params)
  }

  const create = async (payload: CreateCashBoxRenditionInput) => store.create(payload)

  const approve = async (id: string, data?: ApproveRenditionInput) =>
    store.approve(id, data)

  const reject = async (id: string) => store.reject(id)

  const remove = async (id: string) => store.remove(id)

  const pendingRenditions = computed(() =>
    store.items.filter((r) => r.status === 'pending')
  )

  const approvedRenditions = computed(() =>
    store.items.filter((r) => r.status === 'approved')
  )

  return {
    // state
    renditions: computed(() => store.items),
    current: computed(() => store.current),
    loading: computed(() => store.loading),

    // computed
    pendingRenditions,
    approvedRenditions,

    // actions
    init,
    create,
    approve,
    reject,
    remove,
    fetchOne: store.fetchOne
  }
}
