import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const containerId = getRouterParam(event, 'containerId')
  const body = await readBody(event)
  return apiProxy(event, `/international-operations/containers/${containerId}`, { method: 'PATCH', body })
})
