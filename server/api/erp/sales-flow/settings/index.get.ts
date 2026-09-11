import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(event =>
  apiProxy(event, '/erp/sales-flow/settings', { method: 'GET' })
)
