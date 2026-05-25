import type {
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput
} from '~/modulos/almacen/categories/types/categories.types'

const urlBase = '/api/almacen/categories'

export const useCategoriesService = () => {
  const findAll = () => {
    return $fetch<Category[]>(urlBase, {
      method: 'GET'
    })
  }

  const findTree = () => {
    return $fetch<CategoryTreeNode[]>(`${urlBase}/tree`)
  }

  const findOne = (id: string) => {
    return $fetch<Category>(`${urlBase}/${id}`)
  }

  const create = (data: CreateCategoryInput) => {
    return $fetch<Category>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateCategoryInput) => {
    return $fetch<Category>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }
  const reorder = async (
    id: string,
    payload: { parent_id: string | null; sort_order: number }
  ) => {
    return await $fetch(`/api/categories/${id}/reorder`, {
      method: 'PATCH',
      body: payload
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    findAll,
    findTree,
    findOne,
    create,
    update,
    reorder,
    remove
  }
}
