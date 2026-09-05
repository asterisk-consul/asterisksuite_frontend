import { apiProxy } from '../../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { code } = event.context.params!

  return apiProxy(event, `/access-control/permissions/${code}`)
})
