import type {
  CurrentAccount,
  CurrentAccountEntry,
  CreateCurrentAccountEntryInput,
  CurrentAccountStatement
} from '~/modulos/erp/current-accounts/types/current-accounts.types'

const urlBase = '/api/erp/current-accounts'

export const useCurrentAccountsService = () => {
  const addEntry = (data: CreateCurrentAccountEntryInput) => {
    return $fetch<CurrentAccountEntry>(`${urlBase}/entries`, {
      method: 'POST',
      body: data
    })
  }

  const findByParty = (partyId: string) => {
    return $fetch<CurrentAccount[]>(`${urlBase}/party/${partyId}`)
  }

  const getEntries = (partyId: string) => {
    return $fetch<CurrentAccountEntry[]>(`${urlBase}/party/${partyId}/entries`)
  }

  const getStatement = (partyId: string) => {
    return $fetch<CurrentAccountStatement>(`${urlBase}/party/${partyId}/statement`)
  }

  const getBalance = (partyId: string) => {
    return $fetch<{ currency_code: string; balance: number }>(`${urlBase}/party/${partyId}/balance`)
  }

  const findActive = () => {
    return $fetch<CurrentAccount[]>(`${urlBase}/active`, {
      method: 'GET',
    })
  }

  const findAll = (params?: { party_type?: string; balance_filter?: string }) => {
    return $fetch<CurrentAccount[]>(urlBase, {
      method: 'GET',
      query: params,
    })
  }

  return {
    addEntry,
    findByParty,
    getEntries,
    getStatement,
    getBalance,
    findActive,
    findAll
  }
}
