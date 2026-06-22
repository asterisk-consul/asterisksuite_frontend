import type {
  ProductComponent,
  CreateProductComponentInput,
  UpdateProductComponentInput
} from '~/modulos/logistica/master-data/products-components/types/product-components.types'

const urlBase =
  '/api/logistica/master-data/product-components'

export const useProductComponentsService =
  () => {
    const findAll = () => {
      return $fetch<ProductComponent[]>(
        urlBase,
        {
          method: 'GET'
        }
      )
    }

    const findOne = (id: string) => {
      return $fetch<ProductComponent>(
        `${urlBase}/${id}`
      )
    }

    const create = (
      data: CreateProductComponentInput
    ) => {
      return $fetch<ProductComponent>(
        urlBase,
        {
          method: 'POST',
          body: data
        }
      )
    }

    const update = (
      id: string,
      data: UpdateProductComponentInput
    ) => {
      return $fetch<ProductComponent>(
        `${urlBase}/${id}`,
        {
          method: 'PATCH',
          body: data
        }
      )
    }

    const remove = (id: string) => {
      return $fetch<void>(
        `${urlBase}/${id}`,
        {
          method: 'DELETE'
        }
      )
    }

    return {
      findAll,
      findOne,
      create,
      update,
      remove
    }
  }
