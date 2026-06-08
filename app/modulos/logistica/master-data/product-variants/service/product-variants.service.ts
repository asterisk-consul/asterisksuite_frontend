import type {
  ProductVariant,
  CreateProductVariantInput,
  UpdateProductVariantInput
} from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

const urlBase = '/api/logistica/master-data/product-variants'

export const useProductVariantsService = () => {
  const findAll = () => {
    return $fetch<ProductVariant[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<ProductVariant>(`${urlBase}/${id}`)
  }

  const findByProduct = (productId: string) => {
    return $fetch<ProductVariant[]>(`${urlBase}/product/${productId}`)
  }

  const create = (data: CreateProductVariantInput) => {
    return $fetch<ProductVariant>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateProductVariantInput) => {
    return $fetch<ProductVariant>(`${urlBase}/${id}`, {
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
    findByProduct,
    create,
    update,
    remove
  }
}
