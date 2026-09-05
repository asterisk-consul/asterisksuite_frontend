import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  return apiProxy(event, `/erp/document-sequences/${id}`, {
    method: 'PATCH',
    body
  })
})
