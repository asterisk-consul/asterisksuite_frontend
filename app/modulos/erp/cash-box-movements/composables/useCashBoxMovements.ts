import { computed } from 'vue'
import { useCashBoxMovementsStore } from '../store/cash-box-movements.store'
import { useCashBoxMovementsService } from '../service/cash-box-movements.service'

import type {
  CashBoxMovement,
  CreateCashBoxMovementInput,
  UpdateCashBoxMovementInput,
  FilterCashBoxMovementInput,
  ReverseCashBoxMovementInput
} from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

export function useCashBoxMovements() {
  const store = useCashBoxMovementsStore()
  const service = useCashBoxMovementsService()

  const init = async (params?: FilterCashBoxMovementInput) => {
    await store.fetchAll(params)
  }

  const create = async (payload: CreateCashBoxMovementInput) => store.create(payload)
  const reverse = async (id: string, payload: ReverseCashBoxMovementInput) => store.reverse(id, payload)
  const getMovementDetails = async (cashBoxId: string, movementId: string) =>
    service.getMovementDetails(cashBoxId, movementId)

  const update = async (id: string, payload: UpdateCashBoxMovementInput) =>
    store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const inflows = computed(() =>
    store.items.filter((m) =>
      ['COLLECTION', 'ADVANCE', 'LOAN_PAYMENT', 'ADJUSTMENT', 'CHECK_RECEIVED', 'CREDIT'].includes(m.type)
    )
  )

  const outflows = computed(() =>
    store.items.filter((m) =>
      ['PAYMENT', 'LOAN', 'CHECK_ISSUED', 'TRANSFER', 'DEBIT'].includes(m.type)
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
    reverse,
    getMovementDetails,
    update,
    remove,
    fetchOne: store.fetchOne
  }
}
