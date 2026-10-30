import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler((event) => {
  const requestId = getRouterParam(event, 'requestId')
  if (!requestId) throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de autorización.' })
  return apiProxy(event, `/mcp/authorization/request/${encodeURIComponent(requestId)}/deny`, { method: 'POST' })
})
