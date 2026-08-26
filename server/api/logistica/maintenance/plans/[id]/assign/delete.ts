import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { id, assetId } = getRouterParams(event)

  return apiProxy(event, `/logistica/maintenance/plans/${id}/assign/${assetId}`, {
    method: 'DELETE'
  })
})
