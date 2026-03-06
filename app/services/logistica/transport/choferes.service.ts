import type {
  Driver,
  CreateDriverInput,
  UpdateDriverInput
} from '@/types/logistica/transport/drivers'

export const useChoferesService = () => {
  const getAll = (company_id: string) =>
    $fetch<Driver[]>('/api/logistica/transport/drivers', {
      query: { company_id }
    })

  const getById = (id: string) =>
    $fetch<Driver>(`/api/logistica/transport/drivers/${id}`)

  const create = (body: CreateDriverInput) =>
    $fetch<Driver>('/api/logistica/transport/drivers', {
      method: 'POST',
      body
    })

  const update = (id: string, body: UpdateDriverInput) =>
    $fetch<Driver>(`/api/logistica/transport/drivers/${id}`, {
      method: 'PATCH',
      body
    })

  const remove = (id: string) =>
    $fetch<{ deleted: boolean }>(`/api/logistica/transport/drivers/${id}`, {
      method: 'DELETE'
    })

  return {
    getAll,
    getById,
    create,
    update,
    remove
  }
}
