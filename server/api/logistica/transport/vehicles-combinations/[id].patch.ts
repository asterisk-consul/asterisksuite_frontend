import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)

  return apiProxy(event, `/logistica/vehicle-combinations/${id}`, {
    method: 'PATCH',
    body
  })
})
