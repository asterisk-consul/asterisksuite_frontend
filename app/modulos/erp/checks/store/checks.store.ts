import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useChecksService } from '~/modulos/erp/checks/service/checks.service'

import type {
  Check,
  CreateCheckInput,
  UpdateCheckInput
} from '~/modulos/erp/checks/types/checks.types'

export const useChecksStore = defineStore('checks', () => {
  const service = useChecksService()

  const items = ref<Check[]>([])
  const current = ref<Check | null>(null)
  const upcoming = ref<Check[]>([])
  const pendingNotification = ref<Check[]>([])

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    items.value = []
    current.value = null
    upcoming.value = []
    pendingNotification.value = []
    loading.value = false
  }

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: {
    status?: string
    is_own?: boolean
    bank_name?: string
    due_before?: string
  }) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findAll(params)
      if (generation === requestGeneration) items.value = data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // LOAD ONE
  // =========================

  const fetchOne = async (id: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findOne(id)
      if (generation === requestGeneration) current.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // UPCOMING
  // =========================

  const fetchUpcoming = async (days?: number) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findUpcoming(days)
      if (generation === requestGeneration) upcoming.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // PENDING NOTIFICATION
  // =========================

  const fetchPendingNotification = async () => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findPendingNotification()
      if (generation === requestGeneration) pendingNotification.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateCheckInput) => {
    const created = await service.create(payload)
    items.value.unshift(created)
    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateCheckInput) => {
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

  // =========================
  // ACTIONS: CLEAR, BOUNCE, CONFIRM, REJECT, DEPOSIT
  // =========================

  const updateCheckStatus = async (
    id: string,
    action: 'clear' | 'bounce' | 'confirm' | 'reject'
  ) => {
    const updated = await service[action](id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === id) {
      current.value = updated
    }

    return updated
  }

  const deposit = async (id: string, data: { bank_account_id: string; amount?: number; date?: string }) => {
    const updated = await service.deposit(id, data)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === id) {
      current.value = updated
    }

    return updated
  }

  const revert = async (id: string) => {
    const updated = await service.revert(id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === id) {
      current.value = updated
    }

    return updated
  }

  const collectInCashBox = async (id: string, cashBoxId: string, date: string) => {
    const updated = await service.collectInCashBox(id, cashBoxId, date)
    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) items.value[index] = updated
    if (current.value?.id === id) current.value = updated
    return updated
  }

  const debitOwnCheck = async (id: string, date: string) => {
    const updated = await service.debitOwnCheck(id, date)
    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) items.value[index] = updated
    if (current.value?.id === id) current.value = updated
    return updated
  }

  return {
    // state
    items,
    current,
    upcoming,
    pendingNotification,
    loading,

    // actions
    fetchAll,
    fetchOne,
    fetchUpcoming,
    fetchPendingNotification,
    create,
    update,
    remove,
    clear: (id: string) => updateCheckStatus(id, 'clear'),
    bounce: (id: string) => updateCheckStatus(id, 'bounce'),
    confirm: (id: string) => updateCheckStatus(id, 'confirm'),
    reject: (id: string) => updateCheckStatus(id, 'reject'),
    deposit,
    collectInCashBox,
    debitOwnCheck,
    revert,
    reset
  }
})
