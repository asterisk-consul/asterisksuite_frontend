import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  const body = await readBody(event)

  const companyId = body?.company_id
  if (!companyId) {
    throw createError({ statusCode: 400, message: 'company_id es requerido' })
  }

  const { company_id, ...payload } = body

  return apiProxy(event, `/companies/${companyId}/users/${userId}/password`, {
    method: 'PATCH',
    body: payload
  })
})
