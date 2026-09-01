import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  return apiProxy(event, '/erp/fiscal/jurisdictions', { method: 'GET' })
})
