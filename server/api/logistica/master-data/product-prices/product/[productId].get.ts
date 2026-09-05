import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'productId')

  return apiProxy(event, `/product-prices/product/${productId}`)
})
