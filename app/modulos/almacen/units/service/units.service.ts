import type {
  Unit,
  CreateUnitInput,
  UpdateUnitInput
} from '~/modulos/almacen/units/types/units.types'

const urlBase = '/api/erp/units'

export const useUnitsService = () => {
  const findAll = () => {
    return $fetch<Unit[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<Unit>(`${urlBase}/${id}`)
  }

  const create = (data: CreateUnitInput) => {
    return $fetch<Unit>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (
    id: string,
    data: UpdateUnitInput
  ) => {
    return $fetch<Unit>(`${urlBase}/${id}`, {
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
