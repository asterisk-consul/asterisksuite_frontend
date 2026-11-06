import type { EffectiveCompanyModules } from './platform-modules.types'

export const usePlatformModulesService = () => {
  const requestFetch = useRequestFetch()

  return {
    getEffective: () =>
      requestFetch<EffectiveCompanyModules>('/api/backend/platform-modules/effective', {
        timeout: 10_000,
        retry: 1
      })
  }
}
