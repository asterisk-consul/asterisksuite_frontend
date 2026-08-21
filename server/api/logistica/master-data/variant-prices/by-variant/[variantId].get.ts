import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const variantId = getRouterParam(event, 'variantId')
  return apiProxy(event, `/variant-prices/by-variant/${variantId}`)
})
