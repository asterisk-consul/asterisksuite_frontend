import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const productId = getRouterParam(event, 'productId')
  return apiProxy(event, `/cost-templates/${id}/products/${productId}`, {
    method: 'POST'
  })
})
