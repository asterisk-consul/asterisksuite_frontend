import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { id } = event.context.params!
  const body = await readBody(event)
  return apiProxy(event, `/logistica/cash-box-renditions/${id}/approve`, {
    method: 'PATCH',
    body
  })
})
