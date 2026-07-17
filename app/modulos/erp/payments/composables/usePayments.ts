import { computed } from 'vue'
import { usePaymentsStore } from '../store/payments.store'

import type {
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput
} from '~/modulos/erp/payments/types/payments.types'

import type { PendingDocument, AvailableCheck, CreateCheckInput } from '~/modulos/erp/payments/service/payments.service'

export function usePayments() {
  const store = usePaymentsStore()

  // =========================
  // INIT
  // =========================

  const init = async (params?: {
    party_id?: string
    type?: string
    payment_method?: string
    status?: number
  }) => {
    await store.fetchAll(params)
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreatePaymentInput) => store.create(payload)

  const update = async (id: string, payload: UpdatePaymentInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id)

  const reverse = async (id: string) => store.reverse(id)

  const confirm = async (id: string) => store.confirm(id)

  const markAsPaid = async (id: string) => store.markAsPaid(id)

  const reject = async (id: string) => store.reject(id)

  const fetchPendingDocuments = async (partyId?: string) => store.fetchPendingDocuments(partyId)

  const fetchPendingSalesDocuments = async (partyId?: string) => store.fetchPendingSalesDocuments(partyId)

  const fetchPendingPurchaseDocuments = async (partyId?: string) => store.fetchPendingPurchaseDocuments(partyId)

  const fetchAvailableOwnChecks = async () => store.fetchAvailableOwnChecks()

  const fetchAvailableCustomerChecks = async () => store.fetchAvailableCustomerChecks()

  const createLightCheck = async (data: CreateCheckInput) => store.createLightCheck(data)

  // =========================
  // COMPUTED
  // =========================

  const payments = computed(() => store.items)
  const pendingSalesDocuments = computed(() => store.pendingSalesDocuments)
  const pendingPurchaseDocuments = computed(() => store.pendingPurchaseDocuments)
  const availableOwnChecks = computed(() => store.availableOwnChecks)
  const availableCustomerChecks = computed(() => store.availableCustomerChecks)

  const paymentsByType = computed(() => ({
    payments: store.items.filter((p) => p.type === 'PAYMENT'),
    collections: store.items.filter((p) => p.type === 'COLLECTION')
  }))

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((p) => p.id === id)

  const getPayment = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    payments,
    current: computed(() => store.current),
    pendingSalesDocuments,
    pendingPurchaseDocuments,
    availableOwnChecks,
    availableCustomerChecks,
    loading: computed(() => store.loading),

    // computed
    paymentsByType,

    // helpers
    findById,
    getPayment,

    // actions
    init,
    create,
    update,
    remove,
    reverse,
    confirm,
    markAsPaid,
    reject,
    fetchPendingDocuments,
    fetchPendingSalesDocuments,
    fetchPendingPurchaseDocuments,
    fetchAvailableOwnChecks,
    fetchAvailableCustomerChecks,
    createLightCheck,
    fetchOne: store.fetchOne
  }
}
