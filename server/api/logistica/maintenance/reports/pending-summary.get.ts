import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/logistica/maintenance/reports/pending-summary', {
    method: 'GET'
  })
})
