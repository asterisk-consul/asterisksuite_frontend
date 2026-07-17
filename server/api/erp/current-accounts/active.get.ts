import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/erp/current-accounts/active', {
    method: 'GET',
  })
})
