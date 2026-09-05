// server/api/engineering/components/[id].delete.ts
import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return apiProxy(event, `/erp/engineering/components/${id}`, {
    method: 'DELETE'
  })
})
