import { apiProxy } from '../../../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { userId } = event.context.params!

  return apiProxy(event, `/access-control/users/${userId}/permissions`)
})
