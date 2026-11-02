export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'api2_token')
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador del archivo' })
  }

  const url = `${String(config.apiBase2).replace(/\/$/, '')}/media/files/${encodeURIComponent(id)}`
  const response = await globalThis.fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'No se pudo obtener el archivo'
    })
  }

  return await response.json()
})
