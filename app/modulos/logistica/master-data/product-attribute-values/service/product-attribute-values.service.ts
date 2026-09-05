import type {
  ProductAttributeValue,
  CreateProductAttributeValueInput,
  UpdateProductAttributeValueInput
} from '~/modulos/logistica/master-data/product-attribute-values/types/product-attribute-values.types'

const urlBase =
  '/api/erp/product-attribute-values'

export const useProductAttributeValuesService =
  () => {
    const findAll = () => {
      return $fetch<ProductAttributeValue[]>(
        urlBase,
        {
          method: 'GET'
        }
      )
    }

    const findOne = (id: string) => {
      return $fetch<ProductAttributeValue>(
        `${urlBase}/${id}`
      )
    }

    const create = (
      data: CreateProductAttributeValueInput
    ) => {
      return $fetch<ProductAttributeValue>(
        urlBase,
        {
          method: 'POST',
          body: data
        }
      )
    }

    const update = (
      id: string,
      data: UpdateProductAttributeValueInput
    ) => {
      return $fetch<ProductAttributeValue>(
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
