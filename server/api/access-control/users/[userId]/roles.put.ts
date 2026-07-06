import { apiProxy } from '../../../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { userId } = event.context.params!
  const body = await readBody(event)

  return apiProxy(event, `/access-control/users/${userId}/roles`, {
    method: 'PUT',
    body
  })
})
