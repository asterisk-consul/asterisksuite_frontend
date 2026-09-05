import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'templateId') // ← antes era 'id'
  const componentId = getRouterParam(event, 'componentId')
  const body = await readBody(event)
  return apiProxy(event, `/cost-templates/${templateId}/components/${componentId}`, {
    method: 'PATCH',
    body
  })
})
