export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'api2_token')
  const entityType = getRouterParam(event, 'entityType')
  const entityId = getRouterParam(event, 'entityId')
  if (!entityType || !entityId) {
    throw createError({ statusCode: 400, statusMessage: 'Falta identificar el tipo o el registro de las fotos' })
  }

  const baseUrl = String(config.apiBase2).replace(/\/$/, '')
  const url = `${baseUrl}/media/files/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
  const response = await globalThis.fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'No se pudieron obtener las fotos'
    })
  }

  return await response.json()
})
