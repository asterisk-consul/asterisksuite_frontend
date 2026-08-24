import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  return apiProxy(event, `/international-operations/events/${eventId}`, { method: 'DELETE' })
})
