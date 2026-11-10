export interface PlatformCatalogModule {
  code: string
  name: string
  description: string | null
  icon: string | null
  is_core: boolean
}

export interface PlatformPlan {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
  is_legacy: boolean
  modules: Array<{ module_code: string; enabled: boolean; limits: Record<string, unknown> }>
  _count?: { subscriptions: number }
}

export interface PlatformCompanySubscription {
  id: string
  name: string
  subdomain: string
  subscription: null | { id: string; status: string; plan_id: string; plan: PlatformPlan }
  moduleOverrides: Array<{ module_code: string; state: string; reason: string | null; expires_at: string | null }>
}

export interface PlatformOwnerAccount {
  id: string
  name: string
  email: string
}

export interface PlatformAdministrator {
  id: string
  name: string
  email: string
  companies: Array<{ id: string; name: string; subdomain: string | null }>
}

export interface PlatformAdministratorCandidate {
  id: string
  name: string
  email: string
  alreadyPlatformAdmin: boolean
}

export interface CreatePlatformCompanyInput {
  name: string
  subdomain: string
  ownerEmail: string
  planId: string
  status: string
  trialEndsAt?: string | null
  taxId?: string
  vat_condition?: string
  address?: string
  phone?: string
  email?: string
}

const base = '/api/backend/platform-admin/modules'
const administratorsBase = '/api/backend/platform-admin/administrators'

export const usePlatformPlansService = () => {
  const fetcher = useRequestFetch()
  return {
    catalog: () => fetcher<PlatformCatalogModule[]>(`${base}/catalog`),
    plans: () => fetcher<PlatformPlan[]>(`${base}/plans`),
    companies: () => fetcher<PlatformCompanySubscription[]>(`${base}/companies`),
    findOwnerAccount: (email: string) =>
      fetcher<PlatformOwnerAccount>(`${base}/companies/owner-account`, { query: { email } }),
    createCompany: (body: CreatePlatformCompanyInput) =>
      fetcher<{
        company: { id: string; name: string; subdomain: string }
        owner: PlatformOwnerAccount
        plan: PlatformPlan
      }>(`${base}/companies`, { method: 'POST', body }),
    deleteCompany: (companyId: string, confirmSubdomain: string) =>
      fetcher<{ success: boolean; companyId: string; subdomain: string; tenantDatabaseRemoved: boolean }>(
        `${base}/companies/${companyId}`,
        { method: 'DELETE', body: { confirmSubdomain } }
      ),
    metrics: () =>
      fetcher<{ auditedViolations: number; auditWindowDays: number; violationsByModule: Record<string, number> }>(
        `${base}/metrics`
      ),
    createPlan: (body: { code: string; name: string; description?: string }) =>
      fetcher<PlatformPlan>(`${base}/plans`, { method: 'POST', body }),
    updatePlan: (id: string, body: Partial<Pick<PlatformPlan, 'name' | 'description' | 'active'>>) =>
      fetcher<PlatformPlan>(`${base}/plans/${id}`, { method: 'PATCH', body }),
    setPlanModules: (
      id: string,
      modules: Array<{ moduleCode: string; enabled: boolean; limits?: Record<string, unknown> }>
    ) => fetcher<PlatformPlan>(`${base}/plans/${id}/modules`, { method: 'PUT', body: { modules } }),
    setSubscription: (companyId: string, body: { planId: string; status: string }) =>
      fetcher(`${base}/companies/${companyId}/subscription`, { method: 'PUT', body }),
    setOverride: (companyId: string, moduleCode: string, body: { state: string; reason?: string }) =>
      fetcher(`${base}/companies/${companyId}/overrides/${moduleCode}`, { method: 'PUT', body }),
    removeOverride: (companyId: string, moduleCode: string) =>
      fetcher(`${base}/companies/${companyId}/overrides/${moduleCode}`, { method: 'DELETE' }),
    administrators: () => fetcher<PlatformAdministrator[]>(administratorsBase),
    findAdministratorAccount: (email: string) =>
      fetcher<PlatformAdministratorCandidate>(`${administratorsBase}/lookup`, { query: { email } }),
    setAdministratorScopes: (userId: string, companyIds: string[]) =>
      fetcher<PlatformAdministrator>(`${administratorsBase}/${userId}`, {
        method: 'PUT',
        body: { companyIds }
      }),
    revokeAdministrator: (userId: string) =>
      fetcher<{ success: boolean; user: { id: string; name: string; email: string } }>(
        `${administratorsBase}/${userId}`,
        { method: 'DELETE' }
      )
  }
}
