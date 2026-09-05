import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async event =>
  apiProxy(event, `/intake-records/${getRouterParam(event, 'id')}`, { method: 'PATCH', body: await readBody(event) })
)
