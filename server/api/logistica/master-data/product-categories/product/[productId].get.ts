import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const productId =
    event.context.params?.productId

  return apiProxy(
    event,
    `/product-categories/product/${productId}`
  )
})
