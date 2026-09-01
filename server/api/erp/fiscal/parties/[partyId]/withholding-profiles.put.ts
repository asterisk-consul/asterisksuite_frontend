import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const partyId = getRouterParam(event, 'partyId')
  const body = await readBody(event)
  return apiProxy(event, `/erp/fiscal/parties/${partyId}/withholding-profiles`, { method: 'PUT', body })
})
