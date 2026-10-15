import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useCurrencyRatesService } from '~/modulos/erp/currency-rates/service/currency-rates.service'

import type {
  CurrencyRate,
  CreateCurrencyRateInput,
  UpdateCurrencyRateInput
} from '~/modulos/erp/currency-rates/types/currency-rates.types'

export const useCurrencyRatesStore = defineStore('currencyRates', () => {
  const service = useCurrencyRatesService()

  const items = ref<CurrencyRate[]>([])
  const current = ref<CurrencyRate | null>(null)

  const loading = ref(false)
  const pagination = ref({ page: 1, pageSize: 25, total: 0, pageCount: 0 })

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params: { page?: number; pageSize?: number } = {}) => {
    try {
      loading.value = true

      const response = await service.findAll({
        page: params.page ?? pagination.value.page,
        pageSize: params.pageSize ?? pagination.value.pageSize
      })
      // Compatibilidad durante despliegues donde frontend y backend pueden
      // quedar momentáneamente en versiones distintas.
      if (Array.isArray(response)) {
        items.value = response
        pagination.value = {
          page: 1,
          pageSize: Math.max(response.length, 1),
          total: response.length,
          pageCount: response.length ? 1 : 0
        }
      } else {
        items.value = response.items ?? []
        pagination.value = response.pagination
      }
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

  const create = async (payload: CreateCurrencyRateInput) => {
    const created = await service.create(payload)

    items.value.push(created)

    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateCurrencyRateInput) => {
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
    pagination,

    // computed
    activeItems,

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  }
})
