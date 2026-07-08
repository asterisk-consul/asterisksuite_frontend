import { getCookieOptions } from '~~/server/utils/cookies'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')

  if (refreshToken) {
    const config = useRuntimeConfig()
    const tenant = getTenant(event)
    await $fetch(`${config.apiBase}/auth/logout`, {
      method: 'POST',
      body: { refreshToken },
      headers: { 'x-tenant': tenant }
    }).catch(() => {})
  }

  // Limpiar cookies siempre
  const cookieOpts = getCookieOptions()
  deleteCookie(event, 'api_access', { path: cookieOpts.path, domain: cookieOpts.domain })
  deleteCookie(event, 'api_refresh', { path: cookieOpts.path, domain: cookieOpts.domain })

  return { ok: true }
})
