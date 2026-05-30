import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'productId')
  const query = getQuery(event)
  return apiProxy(event, `/products/costing/${productId}/pareto`, { query })
})
