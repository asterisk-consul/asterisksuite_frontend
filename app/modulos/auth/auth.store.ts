import { defineStore } from 'pinia'
import { authService } from './auth.service'
import type { AuthUser, CompanyMembership } from './auth.types'
import { useCurrentUserEmployee } from '~/composables/useCurrentUserEmployee'

export const useAuthStore = defineStore('auth', () => {
  const { fetchIfNeeded, $reset: resetEmployeeCache } = useCurrentUserEmployee()
  const user = ref<AuthUser | null>(null)
  const companies = ref<CompanyMembership[]>([])
  const selectedCompany = ref<CompanyMembership | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLogged = computed(() => !!user.value)
  const hasMultipleCompanies = computed(() => companies.value.length > 1)
  const needsCompanySelection = computed(() => isLogged.value && hasMultipleCompanies.value && !selectedCompany.value)

  function getCurrentSubdomain(): string | null {
    if (!import.meta.client) return null
    const config = useRuntimeConfig()
    const baseDomain = config.public.baseDomain
    const hostname = window.location.hostname

    if (baseDomain && hostname.endsWith('.' + baseDomain)) {
      return hostname.replace('.' + baseDomain, '')
    }

    if (hostname.endsWith('.localhost')) {
      return hostname.replace('.localhost', '')
    }

    return null
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
    const config = useRuntimeConfig()
    const baseDomain = config.public.baseDomain
    let subdomain: string | null = null

    if (baseDomain && hostname.endsWith('.' + baseDomain)) {
      subdomain = hostname.replace('.' + baseDomain, '')
    } else if (hostname.endsWith('.localhost')) {
      subdomain = hostname.replace('.localhost', '')
    }

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
        restoreSelectedCompany()
        if (!selectedCompany.value) {
          autoSelectCompanyBySubdomain()
        }
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
  }

  function restoreSelectedCompany() {
    if (import.meta.client && companies.value.length > 0) {
      const savedId = localStorage.getItem('selectedCompanyId')
      if (savedId) {
        const found = companies.value.find((c) => c.id === savedId)
        if (found) {
          selectedCompany.value = found
          return
        }
      }
      if (!selectedCompany.value && companies.value.length === 1) {
        selectedCompany.value = companies.value[0]
      }
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const res = await authService.login(email, password)
      resetEmployeeCache()
      user.value = res.user
      companies.value = res.companies ?? []
      if (companies.value.length === 1) {
        selectedCompany.value = companies.value[0]
        persistSelectedCompany(selectedCompany.value)
      } else {
        autoSelectCompanyBySubdomain()
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
      companies.value = res.companies ?? []
      if (companies.value.length === 1) {
        selectedCompany.value = companies.value[0]
        persistSelectedCompany(selectedCompany.value)
      } else {
        autoSelectCompanyBySubdomain()
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
    restoreSelectedCompany()
    if (!selectedCompany.value) {
      autoSelectCompanyBySubdomain()
    }
  }

  async function init() {
    if (initialized.value) return

    try {
      await fetchMe()
    } catch {
      try {
        await useRequestFetch()('/api/auth/refresh', { method: 'POST' })
        await fetchMe()
      } catch {
        user.value = null
        companies.value = []
        selectedCompany.value = null
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
    if (import.meta.client) {
      const config = useRuntimeConfig()
      const domain = config.public.baseDomain || undefined
      const tenantCookie = useCookie('selected_tenant', { domain })
      tenantCookie.value = null
    }
  }

  function selectCompany(company: CompanyMembership) {
    // El empleado/vendedor es por empresa (tenant), invalidar cache y refetch
    resetEmployeeCache()
    fetchIfNeeded().catch(() => {})
    selectedCompany.value = company
    persistSelectedCompany(company)
    if (import.meta.client) {
      const config = useRuntimeConfig()
      const domain = config.public.baseDomain || undefined
      const tenantCookie = useCookie('selected_tenant', { maxAge: 60 * 60 * 24 * 30, domain })
      tenantCookie.value = company.subdomain
    }
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
