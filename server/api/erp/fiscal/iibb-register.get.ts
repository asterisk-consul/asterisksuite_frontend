import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, '/erp/fiscal/iibb-register', {
    method: 'GET',
    query: getQuery(event),
  })
)
