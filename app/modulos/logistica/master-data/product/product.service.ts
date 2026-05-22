import type {
  Product,
  ProductRoot,
  CreateProductInput,
  UpdateProductInput
} from '~/modulos/logistica/master-data/product/product.types'

const baseUrl = '/api/logistica/master-data/products'

export const useProductsService = () => {
  const findAll = () => $fetch<Product[]>(baseUrl)

  const findOne = (id: string) => $fetch<Product>(`${baseUrl}/${id}`)

  const create = (payload: CreateProductInput) =>
    $fetch<Product>(baseUrl, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdateProductInput) =>
    $fetch<Product>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  const getRootProducts = async (id: string) => {
    return await $fetch<ProductRoot[]>(`${baseUrl}/${id}/root-products`)
  }

  return {
    findAll,
    findOne,
    create,
    update,
    remove,
    getRootProducts
  }
}
