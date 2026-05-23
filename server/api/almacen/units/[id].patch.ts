import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  const body = await readBody(event)

  return apiProxy(event, `/erp/units/${id}`, {
    method: 'PATCH',
    body
  })
})
