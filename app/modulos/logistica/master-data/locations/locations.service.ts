import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput
} from '~/modulos/logistica/master-data/locations/types/locations.types'

export const useLocationsService = () => {
  const apiBase = '/api/backend/transport/locations'
  const getAll = () => $fetch<Location[]>(`${apiBase}`)

  const search = (query = '', limit = 30, signal?: AbortSignal) =>
    $fetch<Location[]>(`${apiBase}/search`, {
      query: { q: query, limit },
      signal,
      timeout: 10_000,
      retry: 1
    })

  const getOne = (id: string) => $fetch<Location>(`${apiBase}/${id}`)

  const create = (payload: CreateLocationInput) =>
    $fetch<Location>(`${apiBase}`, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdateLocationInput) =>
    $fetch<Location>(`${apiBase}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const remove = (id: string) =>
    $fetch<void>(`${apiBase}/${id}`, {
      method: 'DELETE'
    })

  return {
    getAll,
    search,
    getOne,
    create,
    update,
    remove
  }
}
