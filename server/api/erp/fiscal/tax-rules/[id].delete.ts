import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return apiProxy(event, `/erp/fiscal/tax-rules/${id}`, { method: 'DELETE' })
})
