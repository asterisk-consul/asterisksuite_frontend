import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  console.log('[confirm-proxy] query received:', JSON.stringify(query))
  return apiProxy(event, `/documents/purchases-documents/${id}/confirm`, {
    method: 'PATCH',
    query: { updateProductPrices: query.updateProductPrices }
  })
})
