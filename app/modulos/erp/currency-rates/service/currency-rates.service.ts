import type {
  CurrencyRate,
  CreateCurrencyRateInput,
  UpdateCurrencyRateInput,
  CurrencyRatesPage
} from '~/modulos/erp/currency-rates/types/currency-rates.types'

const urlBase = '/api/backend/currencies-rate'

export const useCurrencyRatesService = () => {
  const findAll = (params: { page?: number; pageSize?: number } = {}) => {
    return $fetch<CurrencyRatesPage | CurrencyRate[]>(urlBase, {
      method: 'GET',
      query: params,
      timeout: 10_000,
      retry: 1
    })
  }

  const findOne = (id: string) => {
    return $fetch<CurrencyRate>(`${urlBase}/${id}`)
  }

  const create = (data: CreateCurrencyRateInput) => {
    return $fetch<CurrencyRate>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateCurrencyRateInput) => {
    return $fetch<CurrencyRate>(`${urlBase}/${id}`, {
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
