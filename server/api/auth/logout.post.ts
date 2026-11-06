import { getCookieOptions } from '~~/server/utils/cookies'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'api_refresh')

  if (refreshToken) {
    const config = useRuntimeConfig()
    const tenant = getTenant(event)
    await globalThis.fetch(`${String(config.apiBase).replace(/\/$/, '')}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: {
        'x-tenant': tenant,
        'Content-Type': 'application/json'
      }
    }).catch(() => {})
  }

  // Limpiar cookies siempre
  const cookieOpts = getCookieOptions()
  deleteCookie(event, 'api_access', { path: cookieOpts.path, domain: cookieOpts.domain })
  deleteCookie(event, 'api_refresh', { path: cookieOpts.path, domain: cookieOpts.domain })
  deleteCookie(event, 'api_remember', { path: cookieOpts.path, domain: cookieOpts.domain })

  return { ok: true }
})
