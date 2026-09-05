import { getQuery } from 'h3'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const tenant = getTenant(event)
  const query = getQuery(event)
  const format = (query.format as string) || 'xlsx'

  const accessCookie = getCookie(event, 'api_access')
  const params = new URLSearchParams({ format })
  const apiUrl = `${config.apiBase}/accounts/export?${params.toString()}`

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'x-tenant': tenant,
      ...(accessCookie && { Authorization: `Bearer ${accessCookie}` })
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al exportar' }))
    throw createError({ statusCode: response.status, message: error.message || 'Error al exportar' })
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const disposition = response.headers.get('content-disposition') || `attachment; filename=plan_de_cuentas.${format}`

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Disposition': disposition,
  })

  return buffer
})
