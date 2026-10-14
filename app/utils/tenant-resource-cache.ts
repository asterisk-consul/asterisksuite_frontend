type CachedResource<T> = {
  version: number
  savedAt: number
  data: T
}

const CACHE_VERSION = 1

export function activeCompanyId(selectedCompanyId?: string | null) {
  if (selectedCompanyId) return selectedCompanyId
  if (import.meta.client) return localStorage.getItem('selectedCompanyId')
  return null
}

export function readTenantResourceCache<T>(resource: string, companyId: string, maxAgeMs: number) {
  if (!import.meta.client) return null
  const key = `asterisk:${resource}:${companyId}`

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedResource<T>
    if (cached.version !== CACHE_VERSION || Date.now() - cached.savedAt > maxAgeMs) {
      localStorage.removeItem(key)
      return null
    }
    return cached
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function writeTenantResourceCache<T>(resource: string, companyId: string, data: T) {
  if (!import.meta.client) return null

  const savedAt = Date.now()
  try {
    localStorage.setItem(`asterisk:${resource}:${companyId}`, JSON.stringify({
      version: CACHE_VERSION,
      savedAt,
      data
    } satisfies CachedResource<T>))
    return savedAt
  } catch {
    // Si el navegador no permite almacenar o agotó la cuota, se mantiene el flujo online.
    return null
  }
}
