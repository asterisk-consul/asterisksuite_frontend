import { defineStore } from 'pinia'
import { authService } from './auth.service'
import type { AuthUser, CompanyMembership } from './auth.types'
import { useCurrentUserEmployee } from '~/composables/useCurrentUserEmployee'

export const useAuthStore = defineStore('auth', () => {
  const { $reset: resetEmployeeCache } = useCurrentUserEmployee()
  const runtimeConfig = useRuntimeConfig()
  const requestFetch = useRequestFetch()
  const serverHostname = import.meta.server ? useRequestURL().hostname : null
  const selectedTenantCookie = useCookie<string | null>('selected_tenant', {
    maxAge: 60 * 60 * 24 * 30,
    domain: runtimeConfig.public.baseDomain || undefined,
  })
  const user = ref<AuthUser | null>(null)
  const companies = ref<CompanyMembership[]>([])
  const selectedCompany = ref<CompanyMembership | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLogged = computed(() => !!user.value)
  const hasMultipleCompanies = computed(() => companies.value.length > 1)
  const needsCompanySelection = computed(() => isLogged.value && hasMultipleCompanies.value && !selectedCompany.value)

  function getSubdomainFromHostname(hostname: string | null | undefined): string | null {
    if (!hostname) return null
    const baseDomain = runtimeConfig.public.baseDomain?.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
    const normalizedHostname = hostname.split(':')[0]?.toLowerCase() ?? ''
    let subdomain: string | null = null

    if (baseDomain && normalizedHostname.endsWith(`.${baseDomain}`)) {
      subdomain = normalizedHostname.slice(0, -(baseDomain.length + 1))
    } else if (normalizedHostname.endsWith('.localhost')) {
      // En desarrollo puede faltar baseDomain. Los hosts usados son
      // <empresa>.localhost o <empresa>.<dominio>.localhost.
      subdomain = normalizedHostname.split('.')[0] ?? null
    }

    // `dev` es el host compartido de desarrollo, no un tenant. El backend
    // también lo excluye al resolver el host y usa selected_tenant.
    if (!subdomain || ['www', 'app', 'api', 'dev'].includes(subdomain)) return null
    return subdomain
  }

  function getCurrentSubdomain(): string | null {
    if (import.meta.client) return getSubdomainFromHostname(window.location.hostname)
    return getSubdomainFromHostname(serverHostname)
  }

  function autoSelectCompanyBySubdomain(): boolean {
    const subdomain = getCurrentSubdomain()
    if (!subdomain || companies.value.length === 0) return false

    const match = companies.value.find((c) => c.subdomain === subdomain)
    if (match) {
      selectedCompany.value = match
      persistSelectedCompany(match)
      return true
    }
    return false
  }

  function autoSelectByHostname(hostname: string): boolean {
    const subdomain = getSubdomainFromHostname(hostname)
    if (!subdomain || companies.value.length === 0) return false

    const match = companies.value.find((c) => c.subdomain === subdomain)
    if (match) {
      selectedCompany.value = match
      persistSelectedCompany(match)
      return true
    }
    return false
  }

  if (import.meta.client) {
    watch(companies, () => {
      if (companies.value.length > 0 && !selectedCompany.value) {
        // En hosts propios, el subdominio determina la empresa. En localhost,
        // donde el host suele ser compartido, se conserva la última selección.
        if (!autoSelectCompanyBySubdomain()) restoreSelectedCompany()
      }
    })
  }

  function persistSelectedCompany(company: CompanyMembership | null) {
    if (import.meta.client) {
      if (company) {
        localStorage.setItem('selectedCompanyId', company.id)
      } else {
        localStorage.removeItem('selectedCompanyId')
      }
    }

    // La empresa de la interfaz y el tenant que usa el proxy deben coincidir.
    // Se sincroniza también durante SSR para corregir una cookie vieja al entrar
    // directamente por el subdominio de otra empresa.
    selectedTenantCookie.value = company?.subdomain ?? null
  }

  function restoreSelectedCompany() {
    if (companies.value.length === 0) return false

    if (selectedCompany.value && !companies.value.some((company) => company.id === selectedCompany.value?.id)) {
      selectedCompany.value = null
    }

    // Resolver primero por host (empresa explícita), también durante SSR.
    if (autoSelectCompanyBySubdomain()) return true

    // En hosts compartidos como `dev`, localStorage no está disponible durante
    // SSR. La cookie es el contexto que el proxy ya usa para resolver x-tenant.
    if (selectedTenantCookie.value) {
      const tenantCompany = companies.value.find((company) => company.subdomain === selectedTenantCookie.value)
      if (tenantCompany) {
        selectedCompany.value = tenantCompany
        persistSelectedCompany(tenantCompany)
        return true
      }
    }

    if (import.meta.client) {
      const savedId = localStorage.getItem('selectedCompanyId')
      if (savedId) {
        const found = companies.value.find((c) => c.id === savedId)
        if (found) {
          selectedCompany.value = found
        }
      }
    }

    if (!selectedCompany.value && companies.value.length === 1) selectedCompany.value = companies.value[0] ?? null

    persistSelectedCompany(selectedCompany.value)
    return Boolean(selectedCompany.value)
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const res = await authService.login(email, password)
      resetEmployeeCache()
      user.value = res.user
      selectedCompany.value = null
      companies.value = res.companies ?? []
      if (companies.value.length === 1) {
        selectedCompany.value = companies.value[0]
        persistSelectedCompany(selectedCompany.value)
      } else if (!autoSelectCompanyBySubdomain()) {
        restoreSelectedCompany()
      }
    } catch (e: any) {
      error.value =
        e?.data?.message || e?.statusMessage || 'Error al iniciar sesión'

      throw new Error(error.value ?? 'Error al iniciar sesión')
    } finally {
      loading.value = false
    }
  }
  async function register(data: {
    name: string
    email: string
    password: string
  }) {
    loading.value = true
    error.value = null

    try {
      console.log(data)
      const res = await authService.register(data)
      resetEmployeeCache()
      user.value = res.user
      selectedCompany.value = null
      companies.value = res.companies ?? []
      if (companies.value.length === 1) {
        selectedCompany.value = companies.value[0]
        persistSelectedCompany(selectedCompany.value)
      } else if (!autoSelectCompanyBySubdomain()) {
        restoreSelectedCompany()
      }
    } catch (e: any) {
      error.value =
        e?.data?.message || e?.statusMessage || 'Error al registrarse'

      throw new Error(error.value ?? 'Error al registrarse')
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    const me = await authService.me()
    user.value = { id: me.id, name: me.name, email: me.email, role: me.role ?? null }
    companies.value = me.companies ?? []

    // Si el host identifica una empresa, debe prevalecer sobre una selección
    // guardada de otra empresa; en hosts compartidos se restaura la selección.
    if (!autoSelectCompanyBySubdomain()) restoreSelectedCompany()
    // En SSR no podemos leer localStorage; no borres la cookie del tenant hasta
    // que el cliente restaure la empresa guardada o el middleware resuelva el host.
    if (selectedCompany.value) persistSelectedCompany(selectedCompany.value)
    else if (import.meta.client) persistSelectedCompany(null)
  }

  async function init() {
    if (initialized.value) return

    try {
      await fetchMe()
    } catch {
      try {
        await requestFetch('/api/auth/refresh', { method: 'POST' })
        await fetchMe()
      } catch {
        user.value = null
        companies.value = []
        selectedCompany.value = null
        persistSelectedCompany(null)
      }
    }

    initialized.value = true
  }
  async function changePassword(data: {
    currentPassword: string
    newPassword: string
  }) {
    loading.value = true
    error.value = null

    try {
      await authService.changePassword(data)
    } catch (e: any) {
      error.value =
        e?.data?.message || e?.statusMessage || 'Error al cambiar contraseña'

      throw new Error(error.value ?? 'Error al cambiar contraseña')
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await authService.logout()
    resetEmployeeCache()
    user.value = null
    companies.value = []
    selectedCompany.value = null
    persistSelectedCompany(null)
  }

  function selectCompany(company: CompanyMembership) {
    if (selectedCompany.value?.id === company.id) {
      // Una selección repetida también repara una cookie desincronizada.
      persistSelectedCompany(company)
      return
    }

    // Cambiar primero el contexto. Toda recarga posterior debe salir con el tenant nuevo.
    resetEmployeeCache()
    selectedCompany.value = company
    persistSelectedCompany(company)
  }

  return {
    user,
    companies,
    selectedCompany,
    loading,
    register,
    changePassword,
    initialized,
    isLogged,
    hasMultipleCompanies,
    needsCompanySelection,
    error,
    login,
    fetchMe,
    init,
    logout,
    selectCompany,
    autoSelectByHostname
  }
})
