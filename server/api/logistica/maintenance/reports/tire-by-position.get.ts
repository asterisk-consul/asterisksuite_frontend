import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return apiProxy(event, '/logistica/maintenance/reports/tire-by-position', {
    method: 'GET',
    query
  })
})
