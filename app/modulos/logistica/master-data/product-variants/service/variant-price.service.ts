const baseUrl = '/api/logistica/master-data/variant-prices'

export interface VariantPriceData {
  variant_id: string
  currency_id: string
  price: number
  price_list?: string
  margin?: number
  active?: boolean
}

export const useVariantPriceService = () => {
  const findByVariant = (variantId: string) =>
    $fetch(`${baseUrl}/by-variant/${variantId}`)

  const findByProduct = (productId: string) =>
    $fetch(`${baseUrl}/by-product/${productId}`)

  const findOne = (id: string) =>
    $fetch(`${baseUrl}/${id}`)

  const create = (data: VariantPriceData) =>
    $fetch(baseUrl, { method: 'POST', body: data })

  const update = (id: string, data: Partial<VariantPriceData>) =>
    $fetch(`${baseUrl}/${id}`, { method: 'PATCH', body: data })

  const remove = (id: string) =>
    $fetch(`${baseUrl}/${id}`, { method: 'DELETE' })

  const getHistory = (id: string) =>
    $fetch(`${baseUrl}/${id}/history`)

  return {
    findByVariant,
    findByProduct,
    findOne,
    create,
    update,
    remove,
    getHistory,
  }
}
