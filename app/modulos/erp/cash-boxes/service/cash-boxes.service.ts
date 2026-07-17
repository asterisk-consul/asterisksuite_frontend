import type {
  CashBox,
  CashBoxSession,
  CashBoxBalance,
  CashBoxUserRole,
  CreateCashBoxInput,
  UpdateCashBoxInput,
  OpenSessionInput,
  CloseSessionInput,
  ForceCloseSessionInput
} from '~/modulos/erp/cash-boxes/types/cash-boxes.types'

const urlBase = '/api/logistica/cash-boxes'

export const useCashBoxesService = () => {
  const findAll = () => {
    return $fetch<CashBox[]>(urlBase)
  }

  const findOne = (id: string) => {
    return $fetch<CashBox>(`${urlBase}/${id}`)
  }

  const findMain = () => {
    return $fetch<CashBox>(`${urlBase}/main`)
  }

  const create = (data: CreateCashBoxInput) => {
    return $fetch<CashBox>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateCashBoxInput) => {
    return $fetch<CashBox>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  const getBalances = (id: string) => {
    return $fetch<CashBoxBalance[]>(`${urlBase}/${id}/balances`)
  }

  const openSession = (id: string, data: OpenSessionInput) => {
    return $fetch<CashBoxSession>(`${urlBase}/${id}/open`, {
      method: 'POST',
      body: data
    })
  }

  const closeSession = (id: string, data: CloseSessionInput) => {
    return $fetch<CashBoxSession>(`${urlBase}/${id}/close`, {
      method: 'POST',
      body: data
    })
  }

  const forceCloseSession = (id: string, data: ForceCloseSessionInput) => {
    return $fetch<CashBoxSession>(`${urlBase}/${id}/force-close`, {
      method: 'POST',
      body: data
    })
  }

  const getCurrentSession = (id: string) => {
    return $fetch<CashBoxSession | null>(`${urlBase}/${id}/session`)
  }

  const getSessions = (id: string) => {
    return $fetch<CashBoxSession[]>(`${urlBase}/${id}/sessions`)
  }

  const getUserRoles = (id: string) => {
    return $fetch<CashBoxUserRole[]>(`${urlBase}/${id}/user-roles`)
  }

  const addUserRole = (cashBoxId: string, userId: string, role: string) => {
    return $fetch<CashBoxUserRole>(`${urlBase}/${cashBoxId}/user-roles`, {
      method: 'POST',
      body: { user_id: userId, role }
    })
  }

  const removeUserRole = (cashBoxId: string, userId: string) => {
    return $fetch<void>(`${urlBase}/${cashBoxId}/user-roles/${userId}`, {
      method: 'DELETE'
    })
  }

  return {
    findAll,
    findOne,
    findMain,
    create,
    update,
    remove,
    getBalances,
    openSession,
    closeSession,
    forceCloseSession,
    getCurrentSession,
    getSessions,
    getUserRoles,
    addUserRole,
    removeUserRole
  }
}
