import { getCookieOptions } from '~~/server/utils/cookies'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')

  if (!refreshToken) {
    throw createError({ statusCode: 401, message: 'No refresh token' })
  }

  const config = useRuntimeConfig()
  const tenant = getTenant(event)

  try {
    const api = await $fetch<{
      user: any
      accessToken: string
      refreshToken: string
    }>(`${config.apiBase}/auth/refresh`, {
      method: 'POST',
      body: { refreshToken },
      headers: { 'x-tenant': tenant }
    })

    setCookie(event, 'api_access', api.accessToken, {
      ...getCookieOptions(),
      maxAge: 60 * 60 * 24
    })

    setCookie(event, 'api_refresh', api.refreshToken, {
      ...getCookieOptions(),
      maxAge: 60 * 60 * 24 * 7
    })

    return {
      ok: true,
      user: api.user,
      companies: (api as any).companies,
      accessToken: api.accessToken,
      refreshToken: api.refreshToken
    }
  } catch (e: any) {
    deleteCookie(event, 'api_access', { path: '/' })
    deleteCookie(event, 'api_refresh', { path: '/' })

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        message: 'Sesión expirada'
      }
    })
  }
})
