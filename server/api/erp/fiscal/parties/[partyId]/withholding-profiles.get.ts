import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const partyId = getRouterParam(event, 'partyId')
  return apiProxy(event, `/erp/fiscal/parties/${partyId}/withholding-profiles`, { method: 'GET' })
})
