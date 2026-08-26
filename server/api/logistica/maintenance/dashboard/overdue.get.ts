import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/logistica/maintenance/dashboard/overdue', {
    method: 'GET',
    query
  })
})
