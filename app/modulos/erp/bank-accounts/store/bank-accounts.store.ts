import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useBankAccountsService } from '~/modulos/erp/bank-accounts/service/bank-accounts.service'

import type {
  BankAccount,
  BankAccountMovement,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

export const useBankAccountsStore = defineStore('bank-accounts', () => {
  const service = useBankAccountsService()

  const items = ref<BankAccount[]>([])
  const current = ref<BankAccount | null>(null)
  const movements = ref<BankAccountMovement[]>([])

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true
      items.value = await service.findAll()
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
  // MOVEMENTS
  // =========================

  const fetchMovements = async (id: string) => {
    try {
      loading.value = true
      movements.value = await service.getMovements(id)
      return movements.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateBankAccountInput) => {
    const created = await service.create(payload)
    items.value.push(created)
    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateBankAccountInput) => {
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
    movements,
    loading,

    // computed
    activeItems,

    // actions
    fetchAll,
    fetchOne,
    fetchMovements,
    create,
    update,
    remove
  }
})
