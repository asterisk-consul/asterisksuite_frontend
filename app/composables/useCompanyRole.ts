import { useAuthStore } from '~/modulos/auth/auth.store'
import type { CompanyRole } from '~/modulos/auth/auth.types'

export function useCompanyRole() {
  const auth = useAuthStore()

  const companyRole = computed<CompanyRole | null>(() => {
    return (auth.selectedCompany?.role as CompanyRole) ?? null
  })

  const isOwnerOrAdmin = computed(() => {
    const role = companyRole.value
    return role === 'OWNER' || role === 'ADMIN'
  })

  const isOwner = computed(() => companyRole.value === 'OWNER')
  const isAdmin = computed(() => companyRole.value === 'ADMIN')
  const isUser = computed(() => companyRole.value === 'USER')

  return {
    companyRole,
    isOwnerOrAdmin,
    isOwner,
    isAdmin,
    isUser
  }
}
