export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const path = getRequestURL(event).pathname

  // apiBase es "http://localhost:3000/api" → saco el "/api" para ir directo al backend
  const backendBase = config.apiBase.replace(/\/api\/?$/, '')
  const response = await fetch(`${backendBase}${path}`)

  if (!response.ok) {
    throw createError({ statusCode: response.status, message: 'Archivo no encontrado' })
  }

  const buffer = await response.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
})
