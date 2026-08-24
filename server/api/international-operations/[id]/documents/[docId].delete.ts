import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const docId = getRouterParam(event, 'docId')
  return apiProxy(event, `/international-operations/${id}/documents/${docId}`, { method: 'DELETE' })
})
