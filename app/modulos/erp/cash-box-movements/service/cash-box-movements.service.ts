import type {
  CashBoxMovement,
  CreateCashBoxMovementInput,
  UpdateCashBoxMovementInput,
  FilterCashBoxMovementInput
} from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

const urlBase = '/api/logistica/cash-box-movements'

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

  const create = (data: CreateCashBoxMovementInput) => {
    return $fetch<CashBoxMovement>(urlBase, {
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
    create,
    update,
    remove
  }
}
