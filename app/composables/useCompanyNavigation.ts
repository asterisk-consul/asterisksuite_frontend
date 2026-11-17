import { useAuthStore } from '~/modulos/auth/auth.store'

const SHARED_LOCAL_SUBDOMAINS = new Set(['www', 'app', 'api', 'dev'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/** Resuelve una URL aislada por subdominio para conservar el tenant por pestaña. */
export function useCompanyNavigation() {
  const auth = useAuthStore()
  const runtimeConfig = useRuntimeConfig()
  const toast = useToast()

  function getCompanyPathUrl(company: { subdomain: string }, path: string): string | null {
    if (!import.meta.client || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(company.subdomain)) return null

    const hostname = window.location.hostname.toLowerCase()
    const baseDomain = runtimeConfig.public.baseDomain?.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
    const currentLocalTenant = hostname.endsWith('.localhost') && !SHARED_LOCAL_SUBDOMAINS.has(hostname.split('.')[0] ?? '')
      ? hostname.split('.')[0]
      : null
    const sameCompanyOrigin = currentLocalTenant === company.subdomain
      || (LOCAL_HOSTS.has(hostname) && auth.selectedCompany?.id === auth.companies.find(item => item.subdomain === company.subdomain)?.id)

    if (!baseDomain && !sameCompanyOrigin) return null

    if (!baseDomain) {
      const { protocol, port } = window.location
      const portSuffix = port ? `:${port}` : ''
      return `${protocol}//${hostname}${portSuffix}${path}`
    }

    const { protocol, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    return `${protocol}//${company.subdomain}.${baseDomain}${portSuffix}${path}`
  }

  async function navigateToCompanyPath(companyId: string, path: string): Promise<boolean> {
    const company = auth.companies.find(item => item.id === companyId)
    if (!company) {
      toast.add({
        title: 'No se pudo abrir el documento',
        description: 'La empresa de origen no está disponible en tus accesos actuales.',
        color: 'error',
      })
      return false
    }

    const targetPath = path.startsWith('/') && !path.startsWith('//') ? path : `/${path.replace(/^\/+/, '')}`
    auth.selectCompany(company)
    await nextTick()

    if (!import.meta.client) return false

    const configuredBaseDomain = runtimeConfig.public.baseDomain?.trim().replace(/^\.+|\.+$/g, '')
    const localHost = window.location.hostname.toLowerCase()
    const sharedHost = SHARED_LOCAL_SUBDOMAINS.has(localHost.split('.')[0] ?? '')
    const localHostSuffix = localHost.endsWith('.localhost') && !sharedHost
      ? localHost.split('.').slice(1).join('.')
      : null
    const targetDomain = configuredBaseDomain || localHostSuffix

    if (targetDomain && company.subdomain) {
      const { protocol, port } = window.location
      const portSuffix = port ? `:${port}` : ''
      window.location.href = `${protocol}//${company.subdomain}.${targetDomain}${portSuffix}${targetPath}`
    } else {
      // En hosts compartidos el cookie selected_tenant define el tenant. La
      // recarga descarta stores y datos en memoria del contexto anterior.
      window.location.href = targetPath
    }

    return true
  }

  function openCompanyPathInNewTab(companyId: string, path: string): boolean {
    const company = auth.companies.find(item => item.id === companyId)
    if (!company) {
      toast.add({
        title: 'No se pudo abrir el documento',
        description: 'La empresa de origen no está disponible en tus accesos actuales.',
        color: 'error',
      })
      return false
    }

    const targetPath = path.startsWith('/') && !path.startsWith('//') ? path : `/${path.replace(/^\/+/, '')}`
    const companyUrl = getCompanyPathUrl(company, targetPath)
    if (!companyUrl) {
      toast.add({
        title: 'No se pudo abrir otra pestaña',
        description: 'El acceso actual no tiene un subdominio de empresa disponible.',
        color: 'error',
      })
      return false
    }

    window.open(companyUrl, '_blank', 'noopener,noreferrer')
    return true
  }

  return { navigateToCompanyPath, openCompanyPathInNewTab }
}
