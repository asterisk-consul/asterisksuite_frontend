import type {
  Product,
  ProductRoot,
  CreateProductDto,
  UpdateProductInput
} from '~/modulos/logistica/master-data/product/types/product.types'

const baseUrl = '/api/backend/master-data/products'

export const useProductsService = () => {
  // =========================
  // FIND ALL
  // =========================

  const findAll = () => $fetch<Product[]>(baseUrl, {
    timeout: 15_000,
    retry: 2,
    retryDelay: 500
  })

  const search = (query: string, usage?: 'sale' | 'purchase' | null, signal?: AbortSignal) =>
    $fetch<Product[]>(`${baseUrl}/search`, {
      query: { q: query, usage: usage || undefined, limit: 30 },
      signal,
      timeout: 10_000,
      retry: 1
    })

  // =========================
  // FIND ONE
  // =========================

  const findOne = (id: string) => $fetch<Product>(`${baseUrl}/${id}`)

  // =========================
  // CREATE
  // =========================

  const create = (payload: CreateProductDto) =>
    $fetch<Product>(baseUrl, {
      method: 'POST',
      body: payload
    })

  // =========================
  // UPDATE
  // =========================

  const update = (id: string, payload: UpdateProductInput) =>
    $fetch<Product>(`${baseUrl}/${id}`, {
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
  // ROOT PRODUCTS
  // =========================

  const getRootProducts = (id: string) => $fetch<ProductRoot[]>(`${baseUrl}/${id}/root-products`)

  return {
    findAll,
    search,
    findOne,
    create,
    update,
    remove,
    getRootProducts
  }
}
