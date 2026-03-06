import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { trip_id } = event.context.params!
  const body = await readBody(event)
  return apiProxy(event, `/trips/${trip_id}/rates`, { method: 'POST', body })
})
