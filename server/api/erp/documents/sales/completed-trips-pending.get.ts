import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/documents/sales/completed-trips-pending', {
    method: 'GET'
  })
})
