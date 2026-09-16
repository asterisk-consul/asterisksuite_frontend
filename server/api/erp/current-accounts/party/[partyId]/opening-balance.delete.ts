import { apiProxy } from '../../../../../utils/api-proxy'

export default defineEventHandler((event) => {
  const partyId = getRouterParam(event, 'partyId')
  return apiProxy(event, `/erp/current-accounts/party/${partyId}/opening-balance`, {
    method: 'DELETE'
  })
})
