import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import type {
  BusinessParty,
  CreateBusinessPartyInput,
  UpdateBusinessPartyInput
} from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

export const useBusinessPartiesStore = defineStore('businessParties', () => {
  const service = useBusinessPartiesService()
  const authStore = useAuthStore()

  const CACHE_VERSION = 1
  const CACHE_PREFIX = 'asterisk:business-parties'
  const FRESH_FOR_MS = 5 * 60 * 1000
  const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

  const items = ref<BusinessParty[]>([])
  const current = ref<BusinessParty | null>(null)
  const loading = ref(false)
  const refreshing = ref(false)
  const usingCache = ref(false)
  const refreshFailed = ref(false)
  const lastUpdatedAt = ref<number | null>(null)
  const error = ref<string | null>(null)
  const errors = ref<Record<string, string>>({})

  const currentCompanyId = ref<string | null>(null)
  let fetchPromise: Promise<BusinessParty[]> | null = null

  type CachedParties = {
    version: number
    savedAt: number
    items: BusinessParty[]
  }

  const resolveCompanyId = () => {
    const companyId = authStore.selectedCompany?.id
      || (import.meta.client ? localStorage.getItem('selectedCompanyId') : null)
    if (!companyId) return null
    return `${companyId}:${authStore.user?.id || 'session'}`
  }

  const cacheKey = (companyId: string) => `${CACHE_PREFIX}:${companyId}`

  const persistCache = () => {
    if (!import.meta.client || !currentCompanyId.value) return

    try {
      const payload: CachedParties = {
        version: CACHE_VERSION,
        savedAt: Date.now(),
        items: items.value
      }
      localStorage.setItem(cacheKey(currentCompanyId.value), JSON.stringify(payload))
      lastUpdatedAt.value = payload.savedAt
    } catch {
      // El almacenamiento puede estar deshabilitado o lleno. La carga online sigue funcionando.
    }
  }

  const hydrateCache = (companyId: string) => {
    if (!import.meta.client) return false

    try {
      const raw = localStorage.getItem(cacheKey(companyId))
      if (!raw) return false

      const cached = JSON.parse(raw) as CachedParties
      const isValid = cached.version === CACHE_VERSION
        && Array.isArray(cached.items)
        && Date.now() - cached.savedAt <= MAX_CACHE_AGE_MS

      if (!isValid) {
        localStorage.removeItem(cacheKey(companyId))
        return false
      }

      items.value = cached.items
      lastUpdatedAt.value = cached.savedAt
      usingCache.value = true
      return true
    } catch {
      localStorage.removeItem(cacheKey(companyId))
      return false
    }
  }

  const prepareCompany = () => {
    const companyId = resolveCompanyId()
    if (!companyId) return null

    if (currentCompanyId.value !== companyId) {
      currentCompanyId.value = companyId
      items.value = []
      current.value = null
      lastUpdatedAt.value = null
      usingCache.value = false
      fetchPromise = null
      hydrateCache(companyId)
    }

    return companyId
  }

  // =========================
  // COMPUTEDS
  // =========================
  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const clients = computed(() => items.value.filter((i) =>
    i.type === 'CUSTOMER' || i.roles?.some(role => role.role === 'CUSTOMER' && role.active)
  ))

  const suppliers = computed(() =>
    items.value.filter((i) => i.type === 'SUPPLIER')
  )

  // =========================
  // LOAD ALL
  // =========================
  const fetchAll = async (options: { force?: boolean } | string = {}) => {
    prepareCompany()

    // Algunos formularios heredados todavía envían un companyId. El tenant real
    // se resuelve por sesión/header; se acepta el argumento para no romperlos.
    const force = typeof options === 'object' && options.force === true

    const cacheIsFresh = lastUpdatedAt.value !== null
      && Date.now() - lastUpdatedAt.value < FRESH_FOR_MS

    if (!force && cacheIsFresh && items.value.length > 0) {
      return items.value
    }

    if (fetchPromise) return fetchPromise

    loading.value = items.value.length === 0
    refreshing.value = true
    refreshFailed.value = false
    error.value = null

    fetchPromise = service.findAll()
      .then((data) => {
        items.value = data
        usingCache.value = false
        persistCache()
        return data
      })
      .catch((err: any) => {
        error.value = err?.data?.message || err?.message || 'No se pudieron actualizar los clientes y proveedores'
        if (items.value.length > 0) {
          refreshFailed.value = true
          return items.value
        }
        throw err
      })
      .finally(() => {
        loading.value = false
        refreshing.value = false
        fetchPromise = null
      })

    return fetchPromise
  }

  // =========================
  // LOAD ONE
  // =========================
  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      const data = await service.findOne(id)
      current.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================
  const create = async (payload: CreateBusinessPartyInput) => {
    try {
      loading.value = true

      error.value = null
      errors.value = {}

      const created = await service.create(payload)

      prepareCompany()
      items.value = [created, ...items.value.filter(item => item.id !== created.id)]
      persistCache()

      return created
    } catch (err: any) {
      errors.value = err?.data?.data?.errors || err?.data?.errors || {}

      error.value =
        err?.data?.data?.message ||
        err?.data?.message ||
        err?.response?.data.message ||
        'Error parte interesada'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATEW
  // =========================
  const update = async (id: string, payload: UpdateBusinessPartyInput) => {
    try {
      loading.value = true
      error.value = null
      errors.value = {}

      const updated = await service.update(id, payload)

      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      persistCache()

      return updated
    } catch (err: any) {
      errors.value = err?.data?.data?.errors || err?.data?.errors || {}

      error.value =
        err?.data?.data?.message ||
        err?.data?.message ||
        err?.response?.data?.message ||
        'Error al actualizar'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // DELETE
  // =========================
  const remove = async (id: string) => {
    await service.remove(id)

    items.value = items.value.filter((i) => i.id !== id)

    if (current.value?.id === id) {
      current.value = null
    }

    persistCache()
  }

  return {
    // state
    items,
    current,
    loading,
    refreshing,
    usingCache,
    refreshFailed,
    lastUpdatedAt,
    error,
    errors,

    // computed
    activeItems,
    clients,
    suppliers,

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  }
})
