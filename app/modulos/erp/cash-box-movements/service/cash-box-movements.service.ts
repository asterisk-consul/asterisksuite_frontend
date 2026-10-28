import type {
  CashBoxMovement,
  CashBoxMovementDetails,
  CreateCashBoxMovementInput,
  UpdateCashBoxMovementInput,
  FilterCashBoxMovementInput,
  ReverseCashBoxMovementInput
} from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

const urlBase = '/api/backend/cash-box-movements'
const cashBoxesUrlBase = '/api/backend/cash-boxes'

export const useCashBoxMovementsService = () => {
  const findAll = (params?: FilterCashBoxMovementInput) => {
    return $fetch<CashBoxMovement[]>(urlBase, {
      method: 'GET',
      query: params
    })
  }

  const findOne = (id: string) => {
    return $fetch<CashBoxMovement>(`${urlBase}/${id}`)
  }

  const getMovementDetails = (cashBoxId: string, movementId: string) =>
    $fetch<CashBoxMovementDetails>(`${cashBoxesUrlBase}/${cashBoxId}/movements/${movementId}/details`)

  const create = (data: CreateCashBoxMovementInput) => {
    return $fetch<CashBoxMovement>(`${urlBase}/manual`, {
      method: 'POST',
      body: data
    })
  }

  const reverse = (id: string, data: ReverseCashBoxMovementInput) => {
    return $fetch<CashBoxMovement>(`${urlBase}/${id}/reverse`, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateCashBoxMovementInput) => {
    return $fetch<CashBoxMovement>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    findAll,
    findOne,
    getMovementDetails,
    create,
    reverse,
    update,
    remove
  }
}
