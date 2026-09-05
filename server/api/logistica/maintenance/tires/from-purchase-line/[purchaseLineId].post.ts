import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const { purchaseLineId } = getRouterParams(event)
  const body = await readBody(event)

  return apiProxy(event, `/logistica/maintenance/tires/from-purchase-line/${purchaseLineId}`, {
    method: 'POST',
    body
  })
})
