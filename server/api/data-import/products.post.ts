import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const tenant = getTenant(event)

  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file')

  if (!file) {
    throw createError({ statusCode: 400, message: 'No se envió archivo' })
  }

  const blob = new Blob([file.data], { type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const backendFormData = new FormData()
  backendFormData.append('file', blob, file.filename)

  const accessCookie = getCookie(event, 'api_access')

  // apiBase ya tiene /api al final (ej: http://localhost:3000/api)
  const apiUrl = `${config.apiBase}/data-import/products`

  console.log('[DataImport] URL:', apiUrl)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'x-tenant': tenant,
      ...(accessCookie && { Authorization: `Bearer ${accessCookie}` })
    },
    body: backendFormData
  })

  return response.json()
})
