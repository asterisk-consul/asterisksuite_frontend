export type EffectiveModuleState = 'ENABLED' | 'READ_ONLY' | 'DISABLED'

interface EffectivePlatformModule {
  code: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  isCore: boolean
  state: EffectiveModuleState
  enabled: boolean
  readOnly: boolean
  source: 'CORE' | 'PLAN' | 'OVERRIDE' | 'DEPENDENCY' | 'UNAVAILABLE'
  reason: string | null
  dependencies: string[]
  limits: Record<string, unknown>
}

export interface EffectiveCompanyModules {
  companyId: string
  subscription: {
    id: string
    status: string
    planCode: string
    planName: string
    startsAt: string
    trialEndsAt: string | null
    renewsAt: string | null
  } | null
  modules: EffectivePlatformModule[]
  resolvedAt: string
}
