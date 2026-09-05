import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  return await apiProxy(event, '/sales/my-sales/pending')
})
