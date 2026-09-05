import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const fileUuid = getRouterParam(event, 'fileUuid')
  return apiProxy(event, `/media/files/${fileUuid}/medium`, { method: 'GET', rawResponse: true })
})
