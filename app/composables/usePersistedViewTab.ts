import { useAuthStore } from '~/modulos/auth/auth.store'

export function usePersistedViewTab<T extends string>(tabKey: string, initialValue: T) {
  const route = useRoute()
  const auth = useAuthStore()
  const key = [
    'view-tab',
    auth.selectedCompany?.id ?? 'no-company',
    auth.user?.id ?? 'anonymous',
    route.path,
    tabKey
  ].join(':')

  return useState<T>(key, () => initialValue)
}
