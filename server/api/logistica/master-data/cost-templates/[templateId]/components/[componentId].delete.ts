export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'templateId')
  const componentId = getRouterParam(event, 'componentId')

  return apiProxy(event, `/cost-templates/${templateId}/components/${componentId}`, {
    method: 'DELETE'
  })
})
