import type { H3Event } from 'h3'
import { getRequestHost, getCookie } from 'h3'
import { resolveTenant } from './tenant-resolver'

export function getTenant(event: H3Event): string {
  const cookieTenant = getCookie(event, 'selected_tenant')
  const host = getRequestHost(event)
  const config = useRuntimeConfig()
  return resolveTenant(host, config.public.baseDomain, cookieTenant)
}
