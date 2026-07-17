import { computed } from 'vue'
import { useCashBoxMovementsStore } from '../store/cash-box-movements.store'

import type {
  CashBoxMovement,
  CreateCashBoxMovementInput,
  UpdateCashBoxMovementInput,
  FilterCashBoxMovementInput
} from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

export function useCashBoxMovements() {
  const store = useCashBoxMovementsStore()

  const init = async (params?: FilterCashBoxMovementInput) => {
    await store.fetchAll(params)
  }

  const create = async (payload: CreateCashBoxMovementInput) => store.create(payload)

  const update = async (id: string, payload: UpdateCashBoxMovementInput) =>
    store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const inflows = computed(() =>
    store.items.filter((m) =>
      ['COLLECTION', 'ADVANCE', 'LOAN_PAYMENT', 'ADJUSTMENT', 'CHECK_RECEIVED'].includes(m.type)
    )
  )

  const outflows = computed(() =>
    store.items.filter((m) =>
      ['PAYMENT', 'LOAN', 'CHECK_ISSUED', 'TRANSFER'].includes(m.type)
    )
  )

  return {
    // state
    movements: computed(() => store.items),
    current: computed(() => store.current),
    loading: computed(() => store.loading),

    // computed
    inflows,
    outflows,

    // actions
    init,
    create,
    update,
    remove,
    fetchOne: store.fetchOne
  }
}
