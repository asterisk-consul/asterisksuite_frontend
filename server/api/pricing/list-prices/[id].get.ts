import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const { id } = event.context.params!
  return await apiProxy(event, `/pricing/list-prices/${id}`)
})
