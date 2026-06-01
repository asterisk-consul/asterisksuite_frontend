import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'productId')
  return apiProxy(event, `/erp/engineering/calculate/${productId}`, {
    method: 'POST'
  })
})
