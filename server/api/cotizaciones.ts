export default defineEventHandler(async () => {
  const response = await globalThis.fetch('https://dolarapi.com/v1/cotizaciones')
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'No se pudieron obtener las cotizaciones' })
  }
  return await response.json()
})
