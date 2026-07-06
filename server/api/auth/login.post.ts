import type { ApiLoginResponse } from '~/modulos/auth/auth.types'
import { getCookieOptions } from '~~/server/utils/cookies'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()
  const fullUrl = `${config.apiBase}/auth/login`

  console.log('=== LOGIN DEBUG INICIO ===')
  console.log('[1] Body recibido:', JSON.stringify(body))
  console.log('[2] apiBase:', config.apiBase)
  console.log('[3] URL completa:', fullUrl)
  console.log('[4] Method:', getMethod(event))
  console.log('[5] Headers:', JSON.stringify(getHeaders(event)))

  try {
    console.log('[6] Intentando $fetch al backend...')

    const api = await $fetch<ApiLoginResponse>(fullUrl, {
      method: 'POST',
      body
    })

    console.log('[7] Backend respondió OK. user email:', api.user?.email)

    setCookie(event, 'api_access', api.accessToken, {
      ...getCookieOptions(),
      maxAge: 60 * 60 * 24
    })

    setCookie(event, 'api_refresh', api.refreshToken, {
      ...getCookieOptions(),
      maxAge: 60 * 60 * 24 * 7
    })

    console.log('=== LOGIN DEBUG FIN (OK) ===')
    return { user: api.user }
  } catch (e: any) {
    console.error('=== LOGIN DEBUG ERROR ===')
    console.error('[ERR-1] statusCode:', e?.status || e?.statusCode)
    console.error('[ERR-2] statusText:', e?.statusText)
    console.error('[ERR-3] data:', JSON.stringify(e?.data))
    console.error('[ERR-4] message:', e?.message)
    console.error('[ERR-5] url:', e?.url || e?.request)
    console.error('[ERR-6] responseUrl:', e?.responseUrl)
    console.error('[ERR-7] full error keys:', Object.keys(e || {}))
    console.error('[ERR-8] full error:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2)?.slice(0, 1000))

    throw createError({
      statusCode: e?.status || 500,
      statusMessage: 'Usuario o contraseña incorrectos',
      data: {
        message: e?.data?.message || 'Credenciales inválidas'
      }
    })
  }
})
