import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return apiProxy(event, `/erp/bank-accounts/${event.context.params.id}/user-roles`, { method: 'POST', body })
})
