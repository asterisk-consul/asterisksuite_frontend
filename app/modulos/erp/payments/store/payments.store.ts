import { defineStore } from 'pinia'
import { ref } from 'vue'

import { usePaymentsService } from '~/modulos/erp/payments/service/payments.service'

import type {
  Payment,
  PaymentStatus,
  CreatePaymentInput,
  UpdatePaymentInput,
  ApplyAdvanceInput,
  AdvanceAvailable
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
  let requestGeneration = 0

  const reset = () => {
    requestGeneration++
    items.value = []
    current.value = null
    pendingSalesDocuments.value = []
    pendingPurchaseDocuments.value = []
    availableOwnChecks.value = []
    availableCustomerChecks.value = []
    loading.value = false
  }

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async (params?: {
    party_id?: string
    type?: string
    payment_method?: string
    status?: PaymentStatus
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

  const reverse = async (id: string, checkAction?: 'RETURN_TO_PORTFOLIO' | 'CANCEL') => {
    const reversed = await service.reverse(id, checkAction)

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
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findPendingSalesDocuments(partyId)
      if (generation === requestGeneration) pendingSalesDocuments.value = data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const fetchPendingPurchaseDocuments = async (partyId?: string) => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findPendingPurchaseDocuments(partyId)
      if (generation === requestGeneration) pendingPurchaseDocuments.value = data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  // =========================
  // AVAILABLE CHECKS
  // =========================

  const fetchAvailableOwnChecks = async () => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findAvailableOwnChecks()
      if (generation === requestGeneration) availableOwnChecks.value = data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const fetchAvailableCustomerChecks = async () => {
    const generation = requestGeneration
    try {
      loading.value = true
      const data = await service.findAvailableCustomerChecks()
      if (generation === requestGeneration) availableCustomerChecks.value = data
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const createLightCheck = async (data: CreateCheckInput) => {
    return service.createLightCheck(data)
  }

  // =========================
  // ADVANCE PAYMENTS
  // =========================

  const applyAdvance = async (paymentId: string, data: ApplyAdvanceInput) => {
    const updated = await service.applyAdvance(paymentId, data)

    const index = items.value.findIndex((i) => i.id === paymentId)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === paymentId) {
      current.value = updated
    }

    return updated
  }

  const removeAdvanceApplication = async (paymentId: string, documentId: string) => {
    const updated = await service.removeAdvanceApplication(paymentId, documentId)

    const index = items.value.findIndex((i) => i.id === paymentId)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === paymentId) {
      current.value = updated
    }

    return updated
  }

  const fetchAdvanceAvailable = async (partyId?: string) => {
    return service.findAdvanceAvailable(partyId)
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
    reject,
    applyAdvance,
    removeAdvanceApplication,
    fetchAdvanceAvailable,
    reset
  }
})
