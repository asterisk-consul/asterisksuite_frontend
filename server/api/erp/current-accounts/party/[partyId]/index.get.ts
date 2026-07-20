import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { partyId } = event.context.params!
  return apiProxy(event, `/erp/current-accounts/party/${partyId}`)
})
