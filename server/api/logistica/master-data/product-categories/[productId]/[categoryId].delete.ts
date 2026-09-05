import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId = event.context.params?.productId

  const categoryId = event.context.params?.categoryId

  return apiProxy(event, `/product-categories/${productId}/${categoryId}`, {
    method: 'DELETE'
  })
})
