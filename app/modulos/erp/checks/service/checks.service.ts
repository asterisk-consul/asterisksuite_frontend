import type {
  Check,
  CreateCheckInput,
  UpdateCheckInput
} from '~/modulos/erp/checks/types/checks.types'

const urlBase = '/api/backend/checks'

export const useChecksService = () => {
  const findAll = (params?: {
    status?: string
    is_own?: boolean
    bank_name?: string
    due_before?: string
  }) => {
    return $fetch<Check[]>(urlBase, {
      method: 'GET',
      query: params
    })
  }

  const findOne = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}`)
  }

  const findUpcoming = (days?: number) => {
    return $fetch<Check[]>(`${urlBase}/upcoming`, {
      method: 'GET',
      query: { days }
    })
  }

  const findPendingNotification = () => {
    return $fetch<Check[]>(`${urlBase}/pending-notification`)
  }

  const create = (data: CreateCheckInput) => {
    return $fetch<Check>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateCheckInput) => {
    return $fetch<Check>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  const clear = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}/clear`, {
      method: 'PATCH'
    })
  }

  const bounce = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}/bounce`, {
      method: 'PATCH'
    })
  }

  const confirm = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}/confirm`, {
      method: 'PATCH'
    })
  }

  const reject = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}/reject`, {
      method: 'PATCH'
    })
  }

  const deposit = (id: string, data: { bank_account_id: string; amount?: number; date?: string }) => {
    return $fetch<Check>(`${urlBase}/${id}/deposit`, {
      method: 'PATCH',
      body: data
    })
  }

  const collectInCashBox = (id: string, cashBoxId: string, date: string) => {
    return $fetch<Check>(`${urlBase}/${id}/collect-cash`, {
      method: 'PATCH',
      body: { cash_box_id: cashBoxId, date }
    })
  }

  const debitOwnCheck = (id: string, date: string) => {
    return $fetch<Check>(`${urlBase}/${id}/debit`, {
      method: 'PATCH',
      body: { date }
    })
  }

  const revert = (id: string) => {
    return $fetch<Check>(`${urlBase}/${id}/revert`, {
      method: 'PATCH'
    })
  }

  return {
    findAll,
    findOne,
    findUpcoming,
    findPendingNotification,
    create,
    update,
    remove,
    clear,
    bounce,
    confirm,
    reject,
    deposit,
    collectInCashBox,
    debitOwnCheck,
    revert
  }
}
