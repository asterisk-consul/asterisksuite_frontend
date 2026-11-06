export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'api2_token')
  const body = await readBody(event)

  const response = await globalThis.fetch(`${String(config.apiBase2).replace(/\/$/, '')}/media/files`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    body: body == null ? undefined : JSON.stringify(body)
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined)
    throw createError({
      statusCode: response.status,
      statusMessage: 'No se pudo guardar el archivo',
      data: errorBody
    })
  }

  return await response.json()
})
