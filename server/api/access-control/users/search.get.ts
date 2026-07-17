import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/access-control/users/search', { query: { q: query.q } })
})
