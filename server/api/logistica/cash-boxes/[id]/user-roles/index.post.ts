import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  console.log('[user-roles POST] body:', JSON.stringify(body))
  return apiProxy(event, `/logistica/cash-boxes/${event.context.params.id}/user-roles`, { method: 'POST', body })
})
