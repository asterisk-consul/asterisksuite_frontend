import { apiProxy } from '../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return apiProxy(event, '/companies', {
    method: 'POST',
    body
  })
})
