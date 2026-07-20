import { computed } from 'vue'
import { useCashBoxTransfersStore } from '../store/cash-box-transfers.store'

import type {
  CashBoxTransfer,
  CreateCashBoxTransferInput
} from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'

export function useCashBoxTransfers() {
  const store = useCashBoxTransfersStore()

  const init = async (params?: {
    source_type?: string
    source_id?: string
    dest_type?: string
    dest_id?: string
    status?: string
  }) => {
    await store.fetchAll(params)
  }

  const create = async (payload: CreateCashBoxTransferInput) => store.create(payload)

  const confirm = async (id: string) => store.confirm(id)

  const cancel = async (id: string) => store.cancel(id)

  const remove = async (id: string) => store.remove(id)

  const pendingTransfers = computed(() =>
    store.items.filter((t) => t.status === 'pending')
  )

  const completedTransfers = computed(() =>
    store.items.filter((t) => t.status === 'completed')
  )

  return {
    // state
    transfers: computed(() => store.items),
    current: computed(() => store.current),
    loading: computed(() => store.loading),

    // computed
    pendingTransfers,
    completedTransfers,

    // actions
    init,
    create,
    confirm,
    cancel,
    remove,
    fetchOne: store.fetchOne
  }
}
