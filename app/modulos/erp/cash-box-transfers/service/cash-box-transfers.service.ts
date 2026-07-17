import type {
  CashBoxTransfer,
  CreateCashBoxTransferInput
} from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'

const urlBase = '/api/logistica/cash-box-transfers'

export const useCashBoxTransfersService = () => {
  const findAll = (params?: {
    source_type?: string
    source_id?: string
    dest_type?: string
    dest_id?: string
    status?: string
  }) => {
    return $fetch<CashBoxTransfer[]>(urlBase, {
      method: 'GET',
      query: params
    })
  }

  const findOne = (id: string) => {
    return $fetch<CashBoxTransfer>(`${urlBase}/${id}`)
  }

  const create = (data: CreateCashBoxTransferInput) => {
    return $fetch<CashBoxTransfer>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const confirm = (id: string) => {
    return $fetch<CashBoxTransfer>(`${urlBase}/${id}/confirm`, {
      method: 'PATCH'
    })
  }

  const cancel = (id: string) => {
    return $fetch<CashBoxTransfer>(`${urlBase}/${id}/cancel`, {
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
    confirm,
    cancel,
    remove
  }
}
