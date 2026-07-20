import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return apiProxy(event, '/erp/payment-reports/cash-box-daily', {
    method: 'GET',
    query
  })
})
