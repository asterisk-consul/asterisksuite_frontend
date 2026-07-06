import { apiProxy } from '../../../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { id, userId } = event.context.params!

  return apiProxy(event, `/companies/${id}/users/${userId}`, {
    method: 'DELETE'
  })
})
