import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const containerId = getRouterParam(event, 'containerId')
  return apiProxy(event, `/international-operations/containers/${containerId}`, { method: 'DELETE' })
})
