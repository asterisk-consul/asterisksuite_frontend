import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
const urlBase = '/api/backend/master-data/business-parties'
export const useBusinessPartiesService = () => {
  const findAll = (params?: { type?: string; active?: boolean }) => {
    return $fetch<BusinessParty[]>(`${urlBase}`, {
      method: 'GET',
      query: params,
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

  const addLocation = (id: string, data: {
    label?: string
    address: string
    city?: string
    province?: string
    country?: string
    postalCode?: string
  }) => {
    return $fetch<any>(`${urlBase}/${id}/locations`, {
      method: 'POST',
      body: data
    })
  }

  const linkLocation = (id: string, data: { location_id: string; label?: string }) => {
    return $fetch<any>(`${urlBase}/${id}/locations/link`, {
      method: 'POST',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }
  return { findAll, search, findOne, create, update, addLocation, linkLocation, remove }
}
