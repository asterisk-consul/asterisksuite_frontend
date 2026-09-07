import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const userId = event.context.params.userId
  return apiProxy(event, `/erp/bank-accounts/${event.context.params.id}/user-roles/${userId}`, { method: 'DELETE' })
})
