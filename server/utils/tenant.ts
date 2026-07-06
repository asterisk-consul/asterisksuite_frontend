import type { H3Event } from 'h3'
import { getRequestHost, getCookie } from 'h3'

export function getTenant(event: H3Event): string {
  const cookieTenant = getCookie(event, 'selected_tenant')
  if (cookieTenant) {
    return cookieTenant
  }

  const host = getRequestHost(event)

  if (!host) {
    return 'dev'
  }

  const hostname = host.split(':')[0] ?? ''

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    return 'dev'
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '')
  }

  const [subdomain] = hostname.split('.')

  return subdomain ?? 'dev'
}
