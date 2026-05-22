import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useProductsService } from '~/modulos/logistica/master-data/product/product.service'

import type {
  Product,
  ProductRoot,
  CreateProductInput,
  UpdateProductInput
} from '~/modulos/logistica/master-data/product/product.types'

export const useProductsStore = defineStore('products', () => {
  const service = useProductsService()

  const items = ref<Product[]>([])
  const current = ref<Product | null>(null)

  // ACA ESTABA MAL
  // porque el endpoint devuelve MUCHOS root products
  const roots = ref<ProductRoot[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // LOAD ALL
  // =========================
  const fetchAll = async () => {
    try {
      loading.value = true

      items.value = await service.findAll()
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar productos'
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
  const create = async (payload: CreateProductInput) => {
    try {
      loading.value = true

      const created = await service.create(payload)

      items.value.unshift(created)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear producto'
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

      const updated = await service.update(id, payload)

      const index = items.value.findIndex((i) => i.id === id)

      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      return updated
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

  return {
    items,
    current,
    roots,

    loading,
    error,

    fetchAll,
    fetchOne,
    create,
    update,
    remove,

    fetchRootProducts
  }
})
