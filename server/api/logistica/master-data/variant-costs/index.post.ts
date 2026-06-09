import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return apiProxy(event, '/erp/variant-costs', {
    method: 'POST',
    body: await readBody(event)
  })
})
