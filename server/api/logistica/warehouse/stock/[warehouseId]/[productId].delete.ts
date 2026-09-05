import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const { warehouseId, productId } = event.context.params!

  return await apiProxy(event, `/warehouse/stock/${warehouseId}/${productId}`, {
    method: 'DELETE'
  })
})
