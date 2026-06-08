// server/api/engineering/components/[id].move.patch.ts
import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  return apiProxy(event, `/erp/engineering/components/${id}/move`, {
    method: 'PATCH',
    body
  })
})
