export default defineCachedEventHandler(async () => {
  const response = await globalThis.fetch('https://dolarapi.com/v1/dolares', {
    signal: AbortSignal.timeout(5000)
  })
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'No se pudieron obtener las cotizaciones' })
  }
  return await response.json()
}, {
  name: 'dashboard-dollar-rates',
  maxAge: 300,
  staleMaxAge: 3600,
})
