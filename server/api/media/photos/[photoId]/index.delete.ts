import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const photoId = getRouterParam(event, 'photoId')
  return apiProxy(event, `/media/photos/${photoId}`, { method: 'DELETE' })
})
