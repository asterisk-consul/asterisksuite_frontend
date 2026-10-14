import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useBankAccountsService } from '~/modulos/erp/bank-accounts/service/bank-accounts.service'

import type {
  BankAccount,
  BankAccountMovement,
  CreateBankAccountInput,
  CreateBankMovementInput,
  UpdateBankAccountInput,
  DeleteBankAccountInput
} from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

export const useBankAccountsStore = defineStore('bank-accounts', () => {
  const service = useBankAccountsService()

  const items = ref<BankAccount[]>([])
  const current = ref<BankAccount | null>(null)
  const movements = ref<BankAccountMovement[]>([])

  const loading = ref(false)
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    items.value = []
    current.value = null
    movements.value = []
    loading.value = false
  }

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
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findAll()
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
  // MOVEMENTS
  // =========================

  const fetchMovements = async (id: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.getMovements(id)
      if (generation === requestGeneration) movements.value = data
      return data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const createMovement = async (id: string, payload: CreateBankMovementInput) => {
    const created = await service.createMovement(id, payload)
    await fetchMovements(id)
    current.value = await service.findOne(id)
    return created
  }

  const cancelMovement = async (id: string, movementId: string) => {
    const result = await service.cancelMovement(id, movementId)
    await fetchMovements(id)
    current.value = await service.findOne(id)
    return result
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

  const remove = async (id: string, data: DeleteBankAccountInput) => {
    await service.remove(id, data)
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
    createMovement,
    cancelMovement,
    create,
    update,
    remove,
    reset
  }
})
