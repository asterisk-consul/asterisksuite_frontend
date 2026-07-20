import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const entityType = getRouterParam(event, 'entityType')
  const entityId = getRouterParam(event, 'entityId')
  return apiProxy(event, `/media/photos/${entityType}/${entityId}`, { method: 'GET' })
})
