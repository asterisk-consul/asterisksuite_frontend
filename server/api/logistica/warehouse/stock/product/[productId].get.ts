import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const { productId } = event.context.params!

  return await apiProxy(event, `/warehouse/stock/product/${productId}`)
})
