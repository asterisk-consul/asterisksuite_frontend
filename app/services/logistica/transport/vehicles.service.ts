import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput
} from '~/types/logistica/transport/vehicles'

export const useVehiclesService = () => {
  const getAll = (companyId: string) =>
    $fetch<Vehicle[]>('/api/logistica/transport/vehicles', {
      query: { companyId }
    })

  const getOne = (id: string) =>
    $fetch<Vehicle>(`/api/logistica/transport/vehicles/${id}`)

  const create = (body: CreateVehicleInput) =>
    $fetch<Vehicle>('/api/logistica/transport/vehicles', {
      method: 'POST',
      body
    })

  const update = (id: string, body: UpdateVehicleInput) =>
    $fetch<Vehicle>(`/api/logistica/transport/vehicles/${id}`, {
      method: 'PATCH',
      body
    })

  const deactivate = (id: string) =>
    $fetch<void>(`/api/logistica/transport/vehicles/${id}/deactivate`, {
      method: 'PATCH'
    })

  return {
    getAll,
    getOne,
    create,
    update,
    deactivate
  }
}
