import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id')
  return apiProxy(event, `/documents/sales/${id}/create-dispatch`, { method: 'POST' })
})
