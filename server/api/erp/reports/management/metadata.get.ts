import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler((event) => {
  return apiProxy(event, '/erp/reports/management/metadata', { method: 'GET' })
})
