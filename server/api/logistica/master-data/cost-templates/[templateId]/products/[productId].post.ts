import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'templateId')
  const productId = getRouterParam(event, 'productId')
  return apiProxy(event, `/cost-templates/${templateId}/products/${productId}`, {
    method: 'POST'
  })
})
