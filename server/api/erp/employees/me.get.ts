import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/erp/employees/me', { method: 'GET' })
})
