import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { activeCompanyId, readTenantResourceCache, writeTenantResourceCache } from '~/utils/tenant-resource-cache'

import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import { useProductsService } from '~/modulos/logistica/master-data/product/service/product.service'

import type {
  Product,
  ProductRoot,
  CreateProductInput,
  CreateProductDto,
  UpdateProductInput
} from '~/modulos/logistica/master-data/product/types/product.types'

export const useProductsStore = defineStore('products', () => {
  const service = useProductsService()
  const authStore = useAuthStore()
  const CACHE_RESOURCE = 'products'
  const FRESH_FOR_MS = 5 * 60 * 1000
  const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000
  const cacheCompanyId = ref<string | null>(null)
  const lastUpdatedAt = ref<number | null>(null)
  let fetchPromise: Promise<Product[]> | null = null

  const prepareCache = () => {
    const companyId = activeCompanyId(authStore.selectedCompany?.id)
    if (!companyId) return null
    const cacheScope = `${companyId}:${authStore.user?.id || 'session'}`
    if (cacheCompanyId.value !== cacheScope) {
      cacheCompanyId.value = cacheScope
      items.value = []
      current.value = null
      lastUpdatedAt.value = null
      fetchPromise = null
      const cached = readTenantResourceCache<Product[]>(CACHE_RESOURCE, cacheScope, MAX_CACHE_AGE_MS)
      if (cached) {
        items.value = cached.data
        lastUpdatedAt.value = cached.savedAt
      }
    }
    return cacheScope
  }

  const persistCache = () => {
    if (!cacheCompanyId.value) return
    lastUpdatedAt.value = writeTenantResourceCache(CACHE_RESOURCE, cacheCompanyId.value, items.value)
  }

  // =========================
  // STATE
  // =========================

  const items = ref<Product[]>([])

  const current = ref<Product | null>(null)

  const roots = ref<ProductRoot[]>([])

  const loading = ref(false)

  const error = ref<string | null>(null)

  // =========================
  // LOAD ALL
  // =========================

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
        error.value = err?.data?.message || 'Error al cargar productos'
        if (items.value.length > 0) return items.value
        throw err
      })
      .finally(() => {
        loading.value = false
        fetchPromise = null
      })
    return fetchPromise
  }

  const search = async (query: string, usage?: 'sale' | 'purchase' | null, signal?: AbortSignal) => {
    prepareCache()
    const data = await service.search(query, usage, signal)
    const merged = new Map(items.value.map(product => [product.id, product]))
    for (const product of data) merged.set(product.id, product)
    items.value = [...merged.values()]
    return data
  }

  // =========================
  // LOAD ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const data = await service.findOne(id)

      current.value = data

      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar producto'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateProductDto) => {
    try {
      loading.value = true
      error.value = null
      prepareCache()

      const created = await service.create(payload)

      items.value.unshift(created)
      persistCache()

      return created
    } catch (err: any) {
      const data = err?.data?.data || err?.data || err?.response?._data
      const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || 'Error al crear producto')
      error.value = msg

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateProductInput) => {
    try {
      loading.value = true
      error.value = null

      const updated = await service.update(id, payload)

      // Preservar relaciones que el backend no devuelve en el PATCH
      const merged = {
        ...updated,
        product_tags: current.value?.id === id ? current.value.product_tags : updated.product_tags,
        product_categories: current.value?.id === id ? current.value.product_categories : updated.product_categories
      }

      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) {
        items.value[index] = merged
      }

      if (current.value?.id === id) {
        current.value = merged
      }

      persistCache()

      return merged
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar producto'
      throw err
    } finally {
      loading.value = false
    }
  }
  // =========================
  // DELETE
  // =========================

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      await service.remove(id)

      items.value = items.value.filter((i) => i.id !== id)

      if (current.value?.id === id) {
        current.value = null
      }
      persistCache()
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar producto'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // ROOT PRODUCTS
  // =========================

  const fetchRootProducts = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const data = await service.getRootProducts(id)

      roots.value = data

      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar root products'

      throw err
    } finally {
      loading.value = false
    }
  }

  const patchTags = (tags: ProductTag[]) => {
    if (!current.value) return
    current.value = { ...current.value, product_tags: tags }
  }

  const patchCategories = (categories: { category_id: string; categories: Category }[]) => {
    if (!current.value) return
    current.value = { ...current.value, product_categories: categories }
  }

  return {
    // state
    items,
    current,
    roots,

    loading,
    error,

    // actions
    fetchAll,
    search,
    hydrateCache: prepareCache,
    fetchOne,

    create,
    update,
    remove,

    patchTags,
    patchCategories,
    fetchRootProducts
  }
})
