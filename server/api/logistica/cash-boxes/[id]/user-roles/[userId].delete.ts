import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const userId = event.context.params.userId
  return apiProxy(event, `/logistica/cash-boxes/${event.context.params.id}/user-roles/${userId}`, { method: 'DELETE' })
})
