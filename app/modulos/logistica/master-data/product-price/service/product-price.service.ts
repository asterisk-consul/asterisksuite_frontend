import type {
  ProductPrice,
  CreateProductPriceInput,
  UpdateProductPriceInput
} from '~/modulos/logistica/master-data/product-price/types/product-price.types'

const baseUrl = '/api/logistica/master-data/product-prices'

export const useProductPriceService = () => {
  // =========================
  // FIND BY PRODUCT
  // =========================

  const findByProduct = (productId: string) =>
    $fetch<ProductPrice[]>(`${baseUrl}/product/${productId}`)

  // =========================
  // FIND ONE
  // =========================

  const findOne = (id: string) => $fetch<ProductPrice>(`${baseUrl}/${id}`)

  // =========================
  // CREATE
  // =========================

  const create = (payload: CreateProductPriceInput) =>
    $fetch<ProductPrice>(baseUrl, {
      method: 'POST',
      body: payload
    })

  // =========================
  // UPDATE
  // =========================

  const update = (id: string, payload: UpdateProductPriceInput) =>
    $fetch<ProductPrice>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  // =========================
  // DELETE
  // =========================

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  // =========================
  // HISTORY (audit log)
  // =========================

  const getHistory = (id: string) =>
    $fetch<any[]>(`${baseUrl}/${id}/history`)

  return {
    findByProduct,

    findOne,

    create,
    update,
    remove,
    getHistory
  }
}
