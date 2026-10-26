const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/**
 * Resuelve el tenant solicitado sin permitir que una cookie compartida entre
 * subdominios contradiga el host de una empresa. En localhost el host suele ser
 * común a todas las empresas, por lo que allí sí se usa la selección guardada.
 */
export function resolveTenant(host: string | undefined, baseDomain: string | undefined, cookieTenant?: string): string {
  const hostname = host?.split(':')[0]?.toLowerCase() ?? ''
  const isPrivateIp =
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  const isLocalHost = LOCAL_HOSTS.has(hostname) || isPrivateIp || hostname.endsWith('.localhost')
  const normalizedBaseDomain = baseDomain?.trim().toLowerCase().replace(/^\.+|\.+$/g, '')

  if (hostname && normalizedBaseDomain && hostname.endsWith(`.${normalizedBaseDomain}`)) {
    const hostTenant = hostname.slice(0, -(normalizedBaseDomain.length + 1))
    // `dev` y los hosts comunes no identifican una empresa activa. En cambio,
    // empresa1.asterisksuite.localhost y sus equivalentes son contextos aislados.
    if (hostTenant && !['www', 'app', 'api', 'dev'].includes(hostTenant)) return hostTenant
  }

  if (cookieTenant) return cookieTenant
  if (isLocalHost) return 'dev'
  if (!hostname) return 'dev'
  return hostname.split('.')[0] || 'dev'
}
