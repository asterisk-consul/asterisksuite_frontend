import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, '/intake-records', { query: getQuery(event) })
)
