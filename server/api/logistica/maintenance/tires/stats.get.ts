import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return apiProxy(event, '/logistica/maintenance/tires/stats', {
    method: 'GET',
    query
  })
})
