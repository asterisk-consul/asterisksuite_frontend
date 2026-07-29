import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  if (query.party_type) params.set('party_type', query.party_type as string)
  if (query.currency_code) params.set('currency_code', query.currency_code as string)
  if (query.balance_filter) params.set('balance_filter', query.balance_filter as string)

  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiProxy(event, `/erp/current-accounts${qs}`, {
    method: 'GET',
  })
})
