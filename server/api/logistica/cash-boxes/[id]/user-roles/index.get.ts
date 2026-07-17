import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, `/logistica/cash-boxes/${event.context.params.id}/user-roles`, { method: 'GET' })
})
