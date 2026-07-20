import type {
  BankAccount,
  BankAccountMovement,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

const urlBase = '/api/erp/bank-accounts'

export const useBankAccountsService = () => {
  const findAll = () => {
    return $fetch<BankAccount[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<BankAccount>(`${urlBase}/${id}`)
  }

  const create = (data: CreateBankAccountInput) => {
    return $fetch<BankAccount>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateBankAccountInput) => {
    return $fetch<BankAccount>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  const getMovements = (id: string) => {
    return $fetch<BankAccountMovement[]>(`${urlBase}/${id}/movements`)
  }

  return {
    findAll,
    findOne,
    create,
    update,
    remove,
    getMovements
  }
}
