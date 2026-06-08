import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId = event.context.params?.productId

  const tagId = event.context.params?.tagId

  return apiProxy(event, `/erp/product-tags/${productId}/${tagId}`, {
    method: 'DELETE'
  })
})
