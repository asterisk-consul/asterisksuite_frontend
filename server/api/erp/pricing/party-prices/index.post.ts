import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async event =>
  apiProxy(event, '/pricing/party-prices', { method: 'POST', body: await readBody(event) })
)
