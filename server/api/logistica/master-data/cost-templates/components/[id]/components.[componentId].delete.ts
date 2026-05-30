import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const componentId = getRouterParam(event, 'componentId')
  return apiProxy(event, `/cost-templates/${id}/components/${componentId}`, {
    method: 'DELETE'
  })
})
