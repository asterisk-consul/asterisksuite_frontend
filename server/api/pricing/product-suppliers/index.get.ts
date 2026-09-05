import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return await apiProxy(event, '/pricing/product-suppliers', { query })
})
