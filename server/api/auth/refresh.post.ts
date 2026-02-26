export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')

  if (!refreshToken) {
    throw createError({ statusCode: 401, message: 'No refresh token' })
  }

  const config = useRuntimeConfig()

  try {
    const api = await $fetch<{ accessToken: string; refreshToken: string }>(
      `${config.public.apiBase}/auth/refresh`,
      {
        method: 'POST',
        body: { refreshToken }
      }
    )

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
      maxAge: 60 * 60 * 24 * 7
    })

    return { ok: true }
  } catch (e: any) {
    throw createError({ statusCode: 401, message: 'Refresh failed' })
  }
})
