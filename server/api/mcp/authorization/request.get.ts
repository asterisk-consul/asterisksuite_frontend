import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler((event) => {
  const requestId = getQuery(event).request_id
  if (typeof requestId !== 'string' || !requestId) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de autorización.' })
  }
  return apiProxy(event, '/mcp/authorization/request', { query: { request_id: requestId } })
})
