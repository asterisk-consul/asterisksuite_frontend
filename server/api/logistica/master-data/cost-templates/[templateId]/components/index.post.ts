import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'id')
  const body = await readBody(event)
  return apiProxy(event, `/cost-templates/${templateId}/components`, {
    method: 'POST',
    body
  })
})
