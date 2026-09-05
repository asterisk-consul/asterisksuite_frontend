import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const payId = getRouterParam(event, 'payId')
  return apiProxy(event, `/international-operations/${id}/payments/${payId}`, { method: 'DELETE' })
})
