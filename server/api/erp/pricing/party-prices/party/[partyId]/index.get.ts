import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event => {
  const partyId = getRouterParam(event, 'partyId')
  return apiProxy(event, `/pricing/party-prices/party/${partyId}`, { method: 'GET', query: getQuery(event) })
})
