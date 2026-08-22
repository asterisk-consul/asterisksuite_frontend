import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return await apiProxy(event, '/sales/my-sales/by-client', { query })
})
