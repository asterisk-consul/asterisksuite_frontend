import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useVariantCostsService } from '~/modulos/logistica/master-data/variant-cost/service/variant-cost.service'

import type {
  VariantCost,
  CreateVariantCostInput,
  UpdateVariantCostInput
} from '~/modulos/logistica/master-data/variant-cost/types/variant-costs.types'

export const useVariantCostsStore = defineStore('variantCosts', () => {
  const service = useVariantCostsService()

  const items = ref<VariantCost[]>([])

  const current = ref<VariantCost | null>(null)

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() => items.value.filter((i) => !i.deleted_at))

  const supplierCosts = computed(() => items.value.filter((i) => !!i.supplier))

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
  // CREATE
  // =========================

  const create = async (payload: CreateVariantCostInput) => {
    const created = await service.create(payload)

    items.value.unshift(created)

    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateVariantCostInput) => {
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

  const getHistory = async (id: string) => {
    return await service.getHistory(id)
  }

  return {
    // state
    items,
    current,
    loading,

    // computed
    activeItems,
    supplierCosts,

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    getHistory
  }
})
