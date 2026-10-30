import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'requestId')
  const body = await readBody<{ company_id?: string }>(event)
  if (!requestId || !body?.company_id) {
    throw createError({ statusCode: 400, statusMessage: 'Seleccioná la empresa para autorizar la conexión.' })
  }
  return apiProxy(event, `/mcp/authorization/request/${encodeURIComponent(requestId)}/approve`, {
    method: 'POST',
    body: { company_id: body.company_id }
  })
})
