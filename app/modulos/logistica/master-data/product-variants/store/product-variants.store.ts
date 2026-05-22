import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProductVariantsService } from '~/modulos/logistica/master-data/product-variants/service/product-variants.service'

import type {
  ProductVariant,
  CreateProductVariantInput,
  UpdateProductVariantInput
} from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

export const useProductVariantsStore = defineStore('productVariants', () => {
  const service = useProductVariantsService()

  const items = ref<ProductVariant[]>([])

  const current = ref<ProductVariant | null>(null)

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const variantsWithSku = computed(() => items.value.filter((i) => !!i.sku))

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true

      items.value = await service.findAll()

      return items.value
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
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD BY PRODUCT
  // =========================

  const fetchByProduct = async (productId: string) => {
    try {
      loading.value = true

      items.value = await service.findByProduct(productId)

      return items.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateProductVariantInput) => {
    const created = await service.create(payload)

    items.value.unshift(created)

    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateProductVariantInput) => {
    const updated = await service.update(id, payload)

    const index = items.value.findIndex((i) => i.id === id)

    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === id) {
      current.value = updated
    }

    return updated
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
  }

  return {
    // state
    items,
    current,
    loading,

    // computed
    activeItems,
    variantsWithSku,

    // actions
    fetchAll,
    fetchOne,
    fetchByProduct,
    create,
    update,
    remove
  }
})
