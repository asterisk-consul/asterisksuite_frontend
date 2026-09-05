import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, '/pricing/party-prices/resolve', { method: 'GET', query: getQuery(event) })
)
