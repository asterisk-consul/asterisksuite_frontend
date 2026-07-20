import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useCashBoxTransfersService } from '~/modulos/erp/cash-box-transfers/service/cash-box-transfers.service'

import type {
  CashBoxTransfer,
  CreateCashBoxTransferInput
} from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'

export const useCashBoxTransfersStore = defineStore('cash-box-transfers', () => {
  const service = useCashBoxTransfersService()

  const items = ref<CashBoxTransfer[]>([])
  const current = ref<CashBoxTransfer | null>(null)

  const loading = ref(false)

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: {
    source_type?: string
    source_id?: string
    dest_type?: string
    dest_id?: string
    status?: string
  }) => {
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

  const create = async (payload: CreateCashBoxTransferInput) => {
    const created = await service.create(payload)
    items.value.unshift(created)
    return created
  }

  // =========================
  // CONFIRM
  // =========================

  const confirm = async (id: string) => {
    const updated = await service.confirm(id)

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
  // CANCEL
  // =========================

  const cancel = async (id: string) => {
    const updated = await service.cancel(id)

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
    confirm,
    cancel,
    remove
  }
})
