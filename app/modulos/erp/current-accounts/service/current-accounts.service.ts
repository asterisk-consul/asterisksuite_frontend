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

  const getEntries = (partyId: string, currencyCode?: string) => {
    return $fetch<CurrentAccountEntry[]>(`${urlBase}/party/${partyId}/entries`, {
      method: 'GET',
      query: { currency_code: currencyCode }
    })
  }

  const getStatement = (partyId: string, currencyCode: string) => {
    return $fetch<CurrentAccountStatement>(`${urlBase}/party/${partyId}/statement`, {
      method: 'GET',
      query: { currency_code: currencyCode }
    })
  }

  const getBalance = (partyId: string, currencyCode: string) => {
    return $fetch<{ balance: number }>(`${urlBase}/party/${partyId}/balance`, {
      method: 'GET',
      query: { currency_code: currencyCode }
    })
  }

  const findActive = () => {
    return $fetch<CurrentAccount[]>(`${urlBase}/active`, {
      method: 'GET',
    })
  }

  return {
    addEntry,
    findByParty,
    getEntries,
    getStatement,
    getBalance,
    findActive
  }
}
