import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId')
  return apiProxy(event, `/documents/sales/generate-from-trip/${tripId}`, {
    method: 'POST',
  })
})
