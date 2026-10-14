import { defineStore } from 'pinia'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { activeCompanyId, readTenantResourceCache, writeTenantResourceCache } from '~/utils/tenant-resource-cache'
import { useDepositosService } from '~/modulos/logistica/warehouses/warehouse/depositos.service'
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse
} from '~/modulos/logistica/warehouses/warehouse/warehouse.types'

export const useDepositosStore = defineStore('warehouses', () => {
  const warehouses = ref<Warehouse[]>([])
  const current = ref<Warehouse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const service = useDepositosService()
  const authStore = useAuthStore()
  const CACHE_RESOURCE = 'warehouses'
  const FRESH_FOR_MS = 5 * 60 * 1000
  const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000
  const cacheCompanyId = ref<string | null>(null)
  const lastUpdatedAt = ref<number | null>(null)
  let fetchPromise: Promise<Warehouse[]> | null = null

  const prepareCache = () => {
    const companyId = activeCompanyId(authStore.selectedCompany?.id)
    if (!companyId) return
    const cacheScope = `${companyId}:${authStore.user?.id || 'session'}`
    if (cacheCompanyId.value === cacheScope) return
    cacheCompanyId.value = cacheScope
    warehouses.value = []
    current.value = null
    lastUpdatedAt.value = null
    fetchPromise = null
    const cached = readTenantResourceCache<Warehouse[]>(CACHE_RESOURCE, cacheScope, MAX_CACHE_AGE_MS)
    if (cached) {
      warehouses.value = cached.data
      lastUpdatedAt.value = cached.savedAt
    }
  }

  const persistCache = () => {
    if (!cacheCompanyId.value) return
    lastUpdatedAt.value = writeTenantResourceCache(CACHE_RESOURCE, cacheCompanyId.value, warehouses.value)
  }

  const fetchAll = async (options: { force?: boolean } = {}) => {
    prepareCache()
    const isFresh = lastUpdatedAt.value !== null && Date.now() - lastUpdatedAt.value < FRESH_FOR_MS
    if (!options.force && isFresh && warehouses.value.length > 0) return warehouses.value
    if (fetchPromise) return fetchPromise

    loading.value = warehouses.value.length === 0
    error.value = null
    fetchPromise = service.getAll()
      .then((data) => {
        warehouses.value = data
        persistCache()
        return data
      })
      .catch((err: any) => {
        error.value = err.message
        return warehouses.value
      })
      .finally(() => {
        loading.value = false
        fetchPromise = null
      })
    return fetchPromise
  }

  const fetchById = async (id: string) => {
    loading.value = true
    try {
      current.value = await service.getById(id)
    } finally {
      loading.value = false
    }
  }

  const createWarehouse = async (data: CreateWarehouseInput) => {
    prepareCache()
    const newItem = await service.create(data)
    warehouses.value.push(newItem)
    persistCache()
  }

  const updateWarehouse = async (id: string, data: UpdateWarehouseInput) => {
    const updated = await service.update(id, data)
    const index = warehouses.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      warehouses.value[index] = updated
    }
    persistCache()
  }

  const desactivate = async (id: string) => {
    const updated = await service.desactivate(id)
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index !== -1) warehouses.value[index] = updated
    persistCache()
  }

  const active = async (id: string) => {
    const updated = await service.active(id)
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index !== -1) warehouses.value[index] = updated
    persistCache()
  }

  return {
    warehouses,
    current,
    loading,
    error,
    fetchAll,
    fetchById,
    createWarehouse,
    updateWarehouse,
    desactivate,
    active
  }
})
