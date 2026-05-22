import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'

const urlBase = '/api/logistica/master-data/product-tags'

export const useProductTagsService = () => {
  const assign = (productId: string, tagId: string) => {
    return $fetch<ProductTag>(`${urlBase}/${productId}/${tagId}`, {
      method: 'POST'
    })
  }

  const remove = (productId: string, tagId: string) => {
    return $fetch<void>(`${urlBase}/${productId}/${tagId}`, {
      method: 'DELETE'
    })
  }

  const getProductTags = (productId: string) => {
    return $fetch<ProductTag[]>(`${urlBase}/${productId}`)
  }

  return {
    assign,
    remove,
    getProductTags
  }
}
