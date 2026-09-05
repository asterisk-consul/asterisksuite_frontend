import type {
  ProductListPrice,
  CreateListPriceInput,
  UpdateListPriceInput
} from '../types/list-price.types'

export const useListPricesService = () => {
  const urlBase = '/api/pricing/list-prices'

  const getAll = (priceListId?: string, productId?: string) =>
    $fetch<ProductListPrice[]>(urlBase, {
      query: {
        ...(priceListId ? { price_list_id: priceListId } : {}),
        ...(productId ? { product_id: productId } : {})
      }
    })

  const getById = (id: string) =>
    $fetch<ProductListPrice>(`${urlBase}/${id}`)

  const create = (body: CreateListPriceInput) =>
    $fetch<ProductListPrice>(urlBase, { method: 'POST', body })

  const update = (id: string, body: UpdateListPriceInput) =>
    $fetch<ProductListPrice>(`${urlBase}/${id}`, { method: 'PATCH', body })

  const remove = (id: string) =>
    $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' })

  return { getAll, getById, create, update, remove }
}
