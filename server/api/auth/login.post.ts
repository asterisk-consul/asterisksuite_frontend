import type { ApiLoginResponse } from '~/modulos/auth/auth.types'
import { getCookieOptions } from '~~/server/utils/cookies'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rememberMe = body?.remember === true
  const config = useRuntimeConfig()
  const tenant = getTenant(event)

  try {
    const api = await $fetch<ApiLoginResponse>(`${config.apiBase}/auth/login`, {
      method: 'POST',
      body: { email: body.email, password: body.password },
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
    } else {
      deleteCookie(event, 'api_remember', { path: cookieOptions.path, domain: cookieOptions.domain })
    }

    return { user: api.user, companies: api.companies }
  } catch (e: any) {
    throw createError({
      statusCode: e?.status || 500,
      statusMessage: 'Usuario o contraseña incorrectos',
      data: {
        message: e?.data?.message || 'Credenciales inválidas'
      }
    })
  }
})
