import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCashBoxMovementsService } from '~/modulos/erp/cash-box-movements/service/cash-box-movements.service'

import type {
  CashBoxMovement,
  CreateCashBoxMovementInput,
  UpdateCashBoxMovementInput,
  FilterCashBoxMovementInput
} from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'

export const useCashBoxMovementsStore = defineStore('cash-box-movements', () => {
  const service = useCashBoxMovementsService()

  const items = ref<CashBoxMovement[]>([])
  const current = ref<CashBoxMovement | null>(null)

  const loading = ref(false)

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: FilterCashBoxMovementInput) => {
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

  const create = async (payload: CreateCashBoxMovementInput) => {
    const created = await service.create(payload)
    items.value.unshift(created)
    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateCashBoxMovementInput) => {
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

    // actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  }
})
