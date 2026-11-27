import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { activeCompanyId, readTenantResourceCache, writeTenantResourceCache } from '~/utils/tenant-resource-cache'

import { useDocumentsTypesService } from '~/modulos/erp/documents/documents-types/services/documents-types.service'

import type {
  DocumentsType,
  CreateDocumentsTypeDto,
  UpdateDocumentsTypeDto
} from '~/modulos/erp/documents/documents-types/types/documents-types.types'

export const useDocumentsTypesStore = defineStore('documents-types', () => {
  const items = ref<DocumentsType[]>([])

  const current = ref<DocumentsType | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)

  const service = useDocumentsTypesService()
  const authStore = useAuthStore()
  const CACHE_RESOURCE = 'document-types-v2'
  const FRESH_FOR_MS = 5 * 60 * 1000
  const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000
  const cacheCompanyId = ref<string | null>(null)
  const lastUpdatedAt = ref<number | null>(null)
  let fetchPromise: Promise<DocumentsType[]> | null = null
  let fetchGeneration = 0

  const currentCacheScope = () => {
    const companyId = activeCompanyId(authStore.selectedCompany?.id)
    return companyId ? `${companyId}:${authStore.user?.id || 'session'}` : null
  }

  const invalidatePendingFetch = () => {
    fetchGeneration += 1
    if (fetchPromise) {
      fetchPromise = null
      loading.value = false
    }
  }

  const prepareCache = () => {
    const cacheScope = currentCacheScope()
    if (cacheCompanyId.value === cacheScope) return
    cacheCompanyId.value = cacheScope
    invalidatePendingFetch()
    items.value = []
    current.value = null
    lastUpdatedAt.value = null
    fetchPromise = null
    if (!cacheScope) return
    const cached = readTenantResourceCache<DocumentsType[]>(CACHE_RESOURCE, cacheScope, MAX_CACHE_AGE_MS)
    if (cached) {
      items.value = cached.data
      lastUpdatedAt.value = cached.savedAt
    }
  }

  const persistCache = () => {
    if (!cacheCompanyId.value) return
    lastUpdatedAt.value = writeTenantResourceCache(CACHE_RESOURCE, cacheCompanyId.value, items.value)
  }

  const upsert = (documentType: DocumentsType, expectedScope?: string | null) => {
    prepareCache()
    if (expectedScope !== undefined && (!expectedScope || cacheCompanyId.value !== expectedScope)) return
    invalidatePendingFetch()
    const index = items.value.findIndex(item => item.id === documentType.id)
    if (index === -1) items.value.unshift(documentType)
    else items.value.splice(index, 1, documentType)
    if (current.value?.id === documentType.id) current.value = documentType
    persistCache()
  }

  const removeFromCache = (id: string, expectedScope?: string | null) => {
    prepareCache()
    if (expectedScope !== undefined && (!expectedScope || cacheCompanyId.value !== expectedScope)) return
    invalidatePendingFetch()
    items.value = items.value.filter(item => item.id !== id)
    if (current.value?.id === id) current.value = null
    persistCache()
  }

  const fetchAll = async (options: { force?: boolean } = {}) => {
    prepareCache()
    const isFresh = lastUpdatedAt.value !== null && Date.now() - lastUpdatedAt.value < FRESH_FOR_MS
    if (!options.force && isFresh && items.value.length > 0) return items.value
    if (fetchPromise) return fetchPromise

    loading.value = items.value.length === 0
    error.value = null
    const requestedScope = cacheCompanyId.value
    const requestedGeneration = ++fetchGeneration
    const request = service.findAll()
      .then((data) => {
        prepareCache()
        if (cacheCompanyId.value !== requestedScope || fetchGeneration !== requestedGeneration) return items.value
        items.value = data
        persistCache()
        return data
      })
      .catch((err: any) => {
        prepareCache()
        if (cacheCompanyId.value !== requestedScope || fetchGeneration !== requestedGeneration) return items.value
        error.value = err?.data?.message || err.message
        if (items.value.length > 0) return items.value
        throw err
      })
      .finally(() => {
        if (fetchPromise === request) {
          loading.value = false
          fetchPromise = null
        }
      })
    fetchPromise = request
    return request
  }

 

  const fetchOne = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const item = await service.findOne(id)

      current.value = item

      const index = items.value.findIndex((i) => i.id === id)

      if (index !== -1) {
        items.value[index] = item
      }

      return item
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateDocumentsTypeDto) => {
    error.value = null
    prepareCache()
    loading.value = true
    const requestedScope = cacheCompanyId.value

    try {
      const created = await service.create(payload)
      upsert(created, requestedScope)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateDocumentsTypeDto) => {
    error.value = null
    prepareCache()
    loading.value = true
    const requestedScope = cacheCompanyId.value

    try {
      const updated = await service.update(id, payload)

      upsert(updated, requestedScope)

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

 

  const clearError = () => {
    error.value = null
  }

  return {
    items,
    current,
    loading,
    error,

    fetchAll,
    fetchOne,
    create,
    update,
    upsert,
    removeFromCache,
    currentCacheScope,
    clearError
    
  }
})
