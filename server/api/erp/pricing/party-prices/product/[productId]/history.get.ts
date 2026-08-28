import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event => {
  const productId = getRouterParam(event, 'productId')
  return apiProxy(event, `/pricing/party-prices/product/${productId}/history`, { method: 'GET', query: getQuery(event) })
})
