import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async event =>
  apiProxy(event, `/intake-records/${getRouterParam(event, 'id')}/complete`, { method: 'POST', body: await readBody(event) })
)
