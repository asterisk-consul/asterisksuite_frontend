import { apiProxy } from '~~/server/utils/api-proxy'
export default defineEventHandler(event => apiProxy(event, '/documents/assignment/users'))
