import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { vehicleId } = event.context.params!
  return apiProxy(event, `/logistica/maintenance/vehicles/${vehicleId}/tire-positions`)
})
