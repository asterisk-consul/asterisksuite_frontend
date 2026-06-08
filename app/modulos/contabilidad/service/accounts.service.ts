import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput
} from '~/modulos/contabilidad/types/accounts.types'

const urlBase = '/api/contabilidad/accounts'

export const useAccountsService = () => {
  const findAll = () => {
    return $fetch<Account[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<Account>(`${urlBase}/${id}`)
  }

  const create = (data: CreateAccountInput) => {
    return $fetch<Account>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (
    id: string,
    data: UpdateAccountInput
  ) => {
    return $fetch<Account>(`${urlBase}/${id}`, {
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
