import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const quoteId = getRouterParam(event, 'quoteId')
  const body = await readBody(event)
  return apiProxy(event, `/international-operations/${id}/quotes/${quoteId}/status`, { method: 'PATCH', body })
})
