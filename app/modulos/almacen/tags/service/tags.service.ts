import type {
  Tag,
  CreateTagInput,
  UpdateTagInput
} from '~/modulos/almacen/tags/types/tags.types'

const urlBase = '/api/almacen/tags'

export const useTagsService = () => {
  const findAll = () => {
    return $fetch<Tag[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<Tag>(`${urlBase}/${id}`)
  }

  const create = (data: CreateTagInput) => {
    return $fetch<Tag>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (
    id: string,
    data: UpdateTagInput
  ) => {
    return $fetch<Tag>(`${urlBase}/${id}`, {
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
