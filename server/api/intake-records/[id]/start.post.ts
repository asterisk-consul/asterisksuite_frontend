import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, `/intake-records/${getRouterParam(event, 'id')}/start`, { method: 'POST' })
)
