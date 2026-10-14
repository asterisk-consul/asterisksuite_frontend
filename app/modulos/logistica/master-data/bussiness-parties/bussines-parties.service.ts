import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
const urlBase = '/api/backend/master-data/business-parties'
export const useBusinessPartiesService = () => {
  const findAll = () => {
    return $fetch<BusinessParty[]>(`${urlBase}`, {
      method: 'GET',
      timeout: 15_000,
      retry: 2,
      retryDelay: 500
    })
  }

  const findOne = (id: string) => {
    return $fetch<BusinessParty>(`${urlBase}/${id}`)
  }

  const search = (query: string, types: string[] = [], signal?: AbortSignal) => {
    return $fetch<BusinessParty[]>(`${urlBase}/search`, {
      method: 'GET',
      query: { q: query, types: types.join(','), limit: 30 },
      signal,
      timeout: 10_000,
      retry: 1
    })
  }

  const create = (data: Partial<BusinessParty>) => {
    return $fetch<BusinessParty>(`${urlBase}`, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: Partial<BusinessParty>) => {
    return $fetch<BusinessParty>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }
  return { findAll, search, findOne, create, update, remove }
}
