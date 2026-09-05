import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { id, documentId } = event.context.params!
  return apiProxy(event, `/erp/payments/${id}/apply-advance/${documentId}`, { method: 'DELETE' })
})
