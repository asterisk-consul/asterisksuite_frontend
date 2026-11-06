export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'api2_token')

  const response = await globalThis.fetch(`${String(config.apiBase2).replace(/\/$/, '')}/media/files`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'No se pudieron obtener los archivos'
    })
  }

  return await response.json()
})
