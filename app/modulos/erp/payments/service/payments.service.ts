import type {
  Payment,
  PaymentStatus,
  CreatePaymentInput,
  UpdatePaymentInput,
  ApplyAdvanceInput,
  AdvanceAvailable
} from '~/modulos/erp/payments/types/payments.types'

const urlBase = '/api/erp/payments'
const urlDocsSales = '/api/erp/documents/sales'
const urlDocsPurchases = '/api/erp/documents/purchases'

export interface PendingDocument {
  id: string
  number: number
  date: string
  total: number
  paid_amount: number
  pending_amount: number
  currency_code: string
  exchange_rate?: number | null
  rate_type?: string | null
  converted_total?: number | null
  party_id: string | null
  party_name: string | null
  party_type: string | null
  document_type_code: string | null
  document_type_description: string | null
  document_type_category: string | null
}

export interface AvailableCheck {
  id: string
  check_number: string
  bank_name: string
  bank_branch: string | null
  account_number: string | null
  issuer_name: string
  issuer_id: string | null
  amount: number
  currency_code: string
  issue_date: string
  due_date: string
  status: string
  bank_account: {
    id: string
    name: string
    bank_name: string
    currency_code: string
  } | null
}

export interface CreateCheckInput {
  check_number: string
  bank_name: string
  bank_branch?: string
  account_number?: string
  issuer_name: string
  issuer_id?: string
  amount: number
  currency_code: string
  issue_date: string
  due_date: string
  is_own?: boolean
  notes?: string
  party_id?: string
  party_type?: string
}

export const usePaymentsService = () => {
  const findAll = (params?: {
    party_id?: string
    type?: string
    payment_method?: string
    status?: PaymentStatus
  }) => {
    return $fetch<Payment[]>(urlBase, {
      method: 'GET',
      query: params
    })
  }

  const findOne = (id: string) => {
    return $fetch<Payment>(`${urlBase}/${id}`)
  }

  const findPendingSalesDocuments = (partyId?: string) => {
    return $fetch<PendingDocument[]>(`${urlDocsSales}/pending`, {
      method: 'GET',
      query: partyId ? { party_id: partyId } : {}
    })
  }

  const findPendingPurchaseDocuments = (partyId?: string) => {
    return $fetch<PendingDocument[]>(`${urlDocsPurchases}/pending`, {
      method: 'GET',
      query: partyId ? { party_id: partyId } : {}
    })
  }

  const findAvailableOwnChecks = () => {
    return $fetch<AvailableCheck[]>('/api/erp/checks/available', {
      method: 'GET',
      query: { is_own: 'true' }
    })
  }

  const findAvailableCustomerChecks = () => {
    return $fetch<AvailableCheck[]>('/api/erp/checks/available', {
      method: 'GET',
      query: { is_own: 'false' }
    })
  }

  const createLightCheck = (data: CreateCheckInput) => {
    return $fetch<AvailableCheck>('/api/erp/checks/light', {
      method: 'POST',
      body: data
    })
  }

  const create = (data: CreatePaymentInput) => {
    console.log('[service] POST', urlBase, 'body:', data)
    return $fetch<Payment>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdatePaymentInput) => {
    return $fetch<Payment>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  const reverse = (id: string) => {
    return $fetch<Payment>(`${urlBase}/${id}/reverse`, {
      method: 'POST'
    })
  }

  const confirm = (id: string) => {
    return $fetch<Payment>(`${urlBase}/${id}/confirm`, {
      method: 'POST'
    })
  }

  const markAsPaid = (id: string) => {
    return $fetch<Payment>(`${urlBase}/${id}/pay`, {
      method: 'POST'
    })
  }

  const reject = (id: string) => {
    return $fetch<Payment>(`${urlBase}/${id}/reject`, {
      method: 'POST'
    })
  }

  const applyAdvance = (paymentId: string, data: ApplyAdvanceInput) => {
    return $fetch<Payment>(`${urlBase}/${paymentId}/apply-advance`, {
      method: 'POST',
      body: data
    })
  }

  const removeAdvanceApplication = (paymentId: string, documentId: string) => {
    return $fetch<Payment>(`${urlBase}/${paymentId}/apply-advance/${documentId}`, {
      method: 'DELETE'
    })
  }

  const findAdvanceAvailable = (partyId?: string) => {
    return $fetch<AdvanceAvailable[]>(`${urlBase}/advance-available`, {
      method: 'GET',
      query: partyId ? { party_id: partyId } : {}
    })
  }

  return {
    findAll,
    findOne,
    findPendingSalesDocuments,
    findPendingPurchaseDocuments,
    findAvailableOwnChecks,
    findAvailableCustomerChecks,
    createLightCheck,
    create,
    update,
    remove,
    reverse,
    confirm,
    markAsPaid,
    reject,
    applyAdvance,
    removeAdvanceApplication,
    findAdvanceAvailable
  }
}
