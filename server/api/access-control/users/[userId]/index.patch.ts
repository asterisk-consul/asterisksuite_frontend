import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  const body = await readBody(event)

  // Obtener company_id del body
  const companyId = body?.company_id
  if (!companyId) {
    throw createError({ statusCode: 400, message: 'company_id es requerido' })
  }

  // Extraer company_id del body para que no se envíe al backend
  const { company_id, ...payload } = body

  return apiProxy(event, `/companies/${companyId}/users/${userId}`, {
    method: 'PATCH',
    body: payload
  })
})
