export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')
  if (!refreshToken)
    throw createError({ statusCode: 401, message: 'No refresh token' })

  const config = useRuntimeConfig()

  try {
    // Llamada a tu backend NestJS
    const api = await $fetch<{
      user: any
      accessToken: string
      refreshToken: string
    }>(`${config.apiBase}/auth/refresh`, {
      method: 'POST',
      body: { refreshToken }
    })

    setCookie(event, 'api_access', api.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15
    })

    setCookie(event, 'api_refresh', api.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })

    return { ok: true, user: api.user }
  } catch (e) {
    throw createError({ statusCode: 401, message: 'Refresh failed' })
  }
})
