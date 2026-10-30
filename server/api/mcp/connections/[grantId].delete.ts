import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler((event) => {
  const grantId = getRouterParam(event, 'grantId')
  if (!grantId) throw createError({ statusCode: 400, statusMessage: 'Falta la conexión que querés revocar.' })
  return apiProxy(event, `/mcp/connections/${encodeURIComponent(grantId)}`, { method: 'DELETE' })
})
