import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCashBoxRenditionsService } from '~/modulos/erp/cash-box-renditions/service/cash-box-renditions.service'

import type {
  CashBoxRendition,
  CreateCashBoxRenditionInput,
  ApproveRenditionInput
} from '~/modulos/erp/cash-box-renditions/types/cash-box-renditions.types'

export const useCashBoxRenditionsStore = defineStore('cash-box-renditions', () => {
  const service = useCashBoxRenditionsService()

  const items = ref<CashBoxRendition[]>([])
  const current = ref<CashBoxRendition | null>(null)

  const loading = ref(false)

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: { cash_box_id?: string }) => {
    try {
      loading.value = true
      items.value = await service.findAll(params)
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

  const create = async (payload: CreateCashBoxRenditionInput) => {
    const created = await service.create(payload)
    items.value.unshift(created)
    return created
  }

  // =========================
  // APPROVE
  // =========================

  const approve = async (id: string, data?: ApproveRenditionInput) => {
    const updated = await service.approve(id, data)

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
  // REJECT
  // =========================

  const reject = async (id: string) => {
    const updated = await service.reject(id)

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

    // actions
    fetchAll,
    fetchOne,
    create,
    approve,
    reject,
    remove
  }
})
