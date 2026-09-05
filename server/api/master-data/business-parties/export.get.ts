import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  if (query.type) params.append('type', query.type as string)
  if (query.format) params.append('format', query.format as string)

  const qs = params.toString()
  const path = `/master-data/business-parties/export${qs ? `?${qs}` : ''}`

  return apiProxy(event, path, { method: 'GET' })
})
