import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const componentId = getRouterParam(event, 'componentId')
  const body = await readBody(event)
  return apiProxy(event, `/cost-templates/${id}/components/${componentId}`, {
    method: 'PATCH',
    body
  })
})
