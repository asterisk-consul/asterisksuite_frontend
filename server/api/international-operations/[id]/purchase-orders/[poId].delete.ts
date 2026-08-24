import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const poId = getRouterParam(event, 'poId')
  return apiProxy(event, `/international-operations/${id}/purchase-orders/${poId}`, { method: 'DELETE' })
})
