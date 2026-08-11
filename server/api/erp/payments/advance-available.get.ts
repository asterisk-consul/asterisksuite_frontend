import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/erp/payments/advance-available', { method: 'GET' })
})
