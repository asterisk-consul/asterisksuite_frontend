export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, 'api_access')

  if (!accessToken) {
    throw createError({ statusCode: 401, message: 'No access token' })
  }

  const config = useRuntimeConfig()

  const user = await $fetch(`${config.apiBase}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}` // ✅ JwtAuthGuard lo requiere
    }
  })

  return user
})
