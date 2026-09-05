import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const companyId = body?.company_id
  if (!companyId) {
    throw createError({ statusCode: 400, message: 'company_id es requerido' })
  }

  // Extraer company_id del body para que no se envíe al backend
  const { company_id, ...payload } = body

  return apiProxy(event, `/companies/${companyId}/users/create`, {
    method: 'POST',
    body: payload
  })
})
