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
  const CACHE_RESOURCE = 'document-types'
  const FRESH_FOR_MS = 5 * 60 * 1000
  const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000
  const cacheCompanyId = ref<string | null>(null)
  const lastUpdatedAt = ref<number | null>(null)
  let fetchPromise: Promise<DocumentsType[]> | null = null

  const prepareCache = () => {
    const companyId = activeCompanyId(authStore.selectedCompany?.id)
    if (!companyId) return
    const cacheScope = `${companyId}:${authStore.user?.id || 'session'}`
    if (cacheCompanyId.value === cacheScope) return
    cacheCompanyId.value = cacheScope
    items.value = []
    current.value = null
    lastUpdatedAt.value = null
    fetchPromise = null
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

  const fetchAll = async (options: { force?: boolean } = {}) => {
    prepareCache()
    const isFresh = lastUpdatedAt.value !== null && Date.now() - lastUpdatedAt.value < FRESH_FOR_MS
    if (!options.force && isFresh && items.value.length > 0) return items.value
    if (fetchPromise) return fetchPromise

    loading.value = items.value.length === 0
    error.value = null
    fetchPromise = service.findAll()
      .then((data) => {
        items.value = data
        persistCache()
        return data
      })
      .catch((err: any) => {
        error.value = err?.data?.message || err.message
        if (items.value.length > 0) return items.value
        throw err
      })
      .finally(() => {
        loading.value = false
        fetchPromise = null
      })
    return fetchPromise
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
    loading.value = true
    error.value = null
    prepareCache()

    try {
      const created = await service.create(payload)

      items.value.unshift(created)
      persistCache()

      return created
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateDocumentsTypeDto) => {
    loading.value = true
    error.value = null

    try {
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
    clearError
    
  }
})
