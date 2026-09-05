import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null

      items.value = await service.findAll()

      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar productos'

      throw err
    } finally {
      loading.value = false
    }
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

      const created = await service.create(payload)

      items.value.unshift(created)

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
    fetchOne,

    create,
    update,
    remove,

    patchTags,
    patchCategories,
    fetchRootProducts
  }
})
