import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useProductPriceService } from '~/modulos/logistica/master-data/product-price/service/product-price.service'

import type {
  ProductPrice,
  CreateProductPriceInput,
  UpdateProductPriceInput
} from '~/modulos/logistica/master-data/product-price/types/product-price.types'

export const useProductPriceStore = defineStore('product-prices', () => {
  const service = useProductPriceService()

  // =========================
  // STATE
  // =========================

  const items = ref<ProductPrice[]>([])

  const current = ref<ProductPrice | null>(null)

  const loading = ref(false)

  const error = ref<string | null>(null)

  // =========================
  // FIND BY PRODUCT
  // =========================

  const fetchByProduct = async (productId: string) => {
    try {
      loading.value = true
      error.value = null

      const data = await service.findByProduct(productId)

      items.value = data

      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar precios del producto'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // FIND ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const data = await service.findOne(id)

      current.value = data

      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar precio'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateProductPriceInput) => {
    try {
      loading.value = true
      error.value = null

      const created = await service.create(payload)

      items.value.unshift(created)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear precio'

      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateProductPriceInput) => {
    try {
      loading.value = true
      error.value = null

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
      error.value = err?.data?.message || 'Error al actualizar precio'

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
      error.value = err?.data?.message || 'Error al eliminar precio'

      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    items,
    current,

    loading,
    error,

    // actions
    fetchByProduct,

    fetchOne,

    create,
    update,
    remove
  }
})
