import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event => {
  const dispatchId = getRouterParam(event, 'dispatchId')
  return apiProxy(event, `/documents/sales/dispatch/${dispatchId}/create-remito`, { method: 'POST' })
})
