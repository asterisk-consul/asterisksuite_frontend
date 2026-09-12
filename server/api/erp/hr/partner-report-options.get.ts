import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/hr/partner-report-options', { method: 'GET' })
})
