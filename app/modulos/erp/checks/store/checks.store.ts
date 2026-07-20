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

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: {
    status?: string
    is_own?: boolean
    bank_name?: string
    due_before?: string
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
  // UPCOMING
  // =========================

  const fetchUpcoming = async (days?: number) => {
    try {
      loading.value = true
      upcoming.value = await service.findUpcoming(days)
      return upcoming.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // PENDING NOTIFICATION
  // =========================

  const fetchPendingNotification = async () => {
    try {
      loading.value = true
      pendingNotification.value = await service.findPendingNotification()
      return pendingNotification.value
    } finally {
      loading.value = false
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
  // ACTIONS: CLEAR, BOUNCE, CONFIRM, REJECT
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
    reject: (id: string) => updateCheckStatus(id, 'reject')
  }
})
