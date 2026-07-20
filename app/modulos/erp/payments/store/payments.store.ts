import { defineStore } from 'pinia'
import { ref } from 'vue'

import { usePaymentsService } from '~/modulos/erp/payments/service/payments.service'

import type {
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput
} from '~/modulos/erp/payments/types/payments.types'

import type { PendingDocument, AvailableCheck, CreateCheckInput } from '~/modulos/erp/payments/service/payments.service'

export const usePaymentsStore = defineStore('payments', () => {
  const service = usePaymentsService()

  const items = ref<Payment[]>([])
  const current = ref<Payment | null>(null)
  const pendingSalesDocuments = ref<PendingDocument[]>([])
  const pendingPurchaseDocuments = ref<PendingDocument[]>([])
  const availableOwnChecks = ref<AvailableCheck[]>([])
  const availableCustomerChecks = ref<AvailableCheck[]>([])

  const loading = ref(false)

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: {
    party_id?: string
    type?: string
    payment_method?: string
    status?: number
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

  const create = async (payload: CreatePaymentInput) => {
    const created = await service.create(payload)
    items.value.unshift(created)
    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdatePaymentInput) => {
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
  // REVERSE
  // =========================

  const reverse = async (id: string) => {
    const reversed = await service.reverse(id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = reversed
    }

    if (current.value?.id === id) {
      current.value = reversed
    }

    return reversed
  }

  // =========================
  // CONFIRM
  // =========================

  const confirm = async (id: string) => {
    const confirmed = await service.confirm(id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = confirmed
    }

    if (current.value?.id === id) {
      current.value = confirmed
    }

    return confirmed
  }

  // =========================
  // MARK AS PAID
  // =========================

  const markAsPaid = async (id: string) => {
    const paid = await service.markAsPaid(id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = paid
    }

    if (current.value?.id === id) {
      current.value = paid
    }

    return paid
  }

  // =========================
  // REJECT
  // =========================

  const reject = async (id: string) => {
    const rejected = await service.reject(id)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = rejected
    }

    if (current.value?.id === id) {
      current.value = rejected
    }

    return rejected
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
  // PENDING DOCUMENTS
  // =========================

  const fetchPendingSalesDocuments = async (partyId?: string) => {
    try {
      loading.value = true
      pendingSalesDocuments.value = await service.findPendingSalesDocuments(partyId)
    } finally {
      loading.value = false
    }
  }

  const fetchPendingPurchaseDocuments = async (partyId?: string) => {
    try {
      loading.value = true
      pendingPurchaseDocuments.value = await service.findPendingPurchaseDocuments(partyId)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // AVAILABLE CHECKS
  // =========================

  const fetchAvailableOwnChecks = async () => {
    try {
      loading.value = true
      availableOwnChecks.value = await service.findAvailableOwnChecks()
    } finally {
      loading.value = false
    }
  }

  const fetchAvailableCustomerChecks = async () => {
    try {
      loading.value = true
      availableCustomerChecks.value = await service.findAvailableCustomerChecks()
    } finally {
      loading.value = false
    }
  }

  const createLightCheck = async (data: CreateCheckInput) => {
    return service.createLightCheck(data)
  }

  return {
    // state
    items,
    current,
    pendingSalesDocuments,
    pendingPurchaseDocuments,
    availableOwnChecks,
    availableCustomerChecks,
    loading,

    // actions
    fetchAll,
    fetchOne,
    fetchPendingSalesDocuments,
    fetchPendingPurchaseDocuments,
    fetchAvailableOwnChecks,
    fetchAvailableCustomerChecks,
    createLightCheck,
    create,
    update,
    reverse,
    remove,
    confirm,
    markAsPaid,
    reject
  }
})
