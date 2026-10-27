import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, '/media/library', { query: getQuery(event) })
)
