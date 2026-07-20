import type {
  CashBoxRendition,
  CreateCashBoxRenditionInput,
  ApproveRenditionInput
} from '~/modulos/erp/cash-box-renditions/types/cash-box-renditions.types'

const urlBase = '/api/logistica/cash-box-renditions'

export const useCashBoxRenditionsService = () => {
  const findAll = (params?: { cash_box_id?: string }) => {
    return $fetch<CashBoxRendition[]>(urlBase, {
      method: 'GET',
      query: params
    })
  }

  const findOne = (id: string) => {
    return $fetch<CashBoxRendition>(`${urlBase}/${id}`)
  }

  const create = (data: CreateCashBoxRenditionInput) => {
    return $fetch<CashBoxRendition>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const approve = (id: string, data?: ApproveRenditionInput) => {
    return $fetch<CashBoxRendition>(`${urlBase}/${id}/approve`, {
      method: 'PATCH',
      body: data
    })
  }

  const reject = (id: string) => {
    return $fetch<CashBoxRendition>(`${urlBase}/${id}/reject`, {
      method: 'PATCH'
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
    approve,
    reject,
    remove
  }
}
