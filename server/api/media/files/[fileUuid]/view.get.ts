import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, `/media/files/${getRouterParam(event, 'fileUuid')}/view`, { rawResponse: true })
)
