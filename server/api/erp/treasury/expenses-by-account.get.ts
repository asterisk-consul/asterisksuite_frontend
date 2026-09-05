import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/erp/treasury/expenses-by-account', {
    method: 'GET',
    query
  })
})
