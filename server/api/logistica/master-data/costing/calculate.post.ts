import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return apiProxy(event, '/products/costing/calculate', {
    method: 'POST',
    body
  })
})
