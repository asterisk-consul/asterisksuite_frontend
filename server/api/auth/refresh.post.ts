import { getCookieOptions } from '~~/server/utils/cookies'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')
  const rememberMe = getCookie(event, 'api_remember') === '1'

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

    const cookieOptions = getCookieOptions()
    setCookie(event, 'api_access', api.accessToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: 60 * 60 * 24 } : {})
    })

    setCookie(event, 'api_refresh', api.refreshToken, {
      ...cookieOptions,
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {})
    })

    if (rememberMe) {
      setCookie(event, 'api_remember', '1', {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7
      })
    }

    return {
      ok: true,
      user: api.user,
      companies: (api as any).companies,
      accessToken: api.accessToken,
      refreshToken: api.refreshToken
    }
  } catch (e: any) {
    const cookieOpts = getCookieOptions()
    deleteCookie(event, 'api_access', { path: cookieOpts.path, domain: cookieOpts.domain })
    deleteCookie(event, 'api_refresh', { path: cookieOpts.path, domain: cookieOpts.domain })
    deleteCookie(event, 'api_remember', { path: cookieOpts.path, domain: cookieOpts.domain })

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        message: 'Sesión expirada'
      }
    })
  }
})
