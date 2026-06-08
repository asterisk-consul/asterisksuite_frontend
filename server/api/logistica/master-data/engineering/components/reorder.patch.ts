// server/api/engineering/components.reorder.patch.ts
import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return apiProxy(event, '/erp/engineering/components/reorder', {
    method: 'PATCH',
    body
  })
})
