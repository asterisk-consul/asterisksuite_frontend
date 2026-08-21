import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVariantPriceService, type VariantPriceData } from '../service/variant-price.service'

export const useVariantPriceStore = defineStore('variantPrice', () => {
  const service = useVariantPriceService()

  const items = ref<any[]>([])
  const current = ref<any | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchByProduct = async (productId: string) => {
    try {
      loading.value = true
      error.value = null
      items.value = await service.findByProduct(productId) as any[]
      return items.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar precios de variantes'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchByVariant = async (variantId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await service.findByVariant(variantId)
      return result
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar precios de variante'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (data: VariantPriceData) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(data)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear precio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, data: Partial<VariantPriceData>) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.update(id, data)
      const index = items.value.findIndex((i) => i.id === id)
      if (index >= 0) items.value[index] = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar precio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.remove(id)
      items.value = items.value.filter((i) => i.id !== id)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar precio'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getHistory = async (id: string) => {
    try {
      return await service.getHistory(id)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar historial'
      throw err
    }
  }

  return {
    items,
    current,
    loading,
    error,
    fetchByProduct,
    fetchByVariant,
    create,
    update,
    remove,
    getHistory,
  }
})
