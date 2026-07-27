import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/company-tax-settings', {
    method: 'GET',
    query: { company_id: query.company_id },
  })
})
