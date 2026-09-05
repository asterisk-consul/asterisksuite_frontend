import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  console.log('[proxy-payments] body received:', JSON.stringify(body, null, 2))
  return apiProxy(event, '/erp/payments', {
    method: 'POST',
    body
  })
})
