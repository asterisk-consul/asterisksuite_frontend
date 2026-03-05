import type {
  VehicleCombination,
  CreateVehicleCombinationInput,
  UpdateVehicleCombinationInput
} from '~/types/logistica/transport/vehicles-combinations'

export const useVehicleCombinationsService = () => {
  const getAll = (companyId: string) =>
    $fetch<VehicleCombination[]>(
      '/api/logistica/transport/vehicles-combinations',
      {
        query: { companyId }
      }
    )

  const getOne = (id: string) =>
    $fetch<VehicleCombination>(
      `/api/logistica/transport/vehicles-combinations/${id}`
    )

  const create = (body: CreateVehicleCombinationInput) =>
    $fetch<VehicleCombination>(
      '/api/logistica/transport/vehicles-combinations',
      {
        method: 'POST',
        body
      }
    )

  const update = (id: string, body: UpdateVehicleCombinationInput) =>
    $fetch<VehicleCombination>(
      `/api/logistica/transport/vehicles-combinations/${id}`,
      {
        method: 'PATCH',
        body
      }
    )

  const close = (id: string) =>
    $fetch<VehicleCombination>(
      `/api/logistica/transport/vehicles-combinations/${id}/close`,
      { method: 'PATCH' }
    )

  return {
    getAll,
    getOne,
    create,
    update,
    close
  }
}
