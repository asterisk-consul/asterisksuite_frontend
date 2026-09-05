import type {
  Attribute,
  CreateAttributeInput,
  UpdateAttributeInput
} from '~/modulos/almacen/attributes/types/attributes.types'

const urlBase = '/api/almacen/attributes'

export const useAttributesService = () => {
  const findAll = () => {
    return $fetch<Attribute[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<Attribute>(`${urlBase}/${id}`)
  }

  const create = (data: CreateAttributeInput) => {
    return $fetch<Attribute>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (
    id: string,
    data: UpdateAttributeInput
  ) => {
    return $fetch<Attribute>(`${urlBase}/${id}`, {
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
