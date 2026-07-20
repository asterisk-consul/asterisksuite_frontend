import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/erp/checks/available', {
    method: 'GET',
    query: query
  })
})
