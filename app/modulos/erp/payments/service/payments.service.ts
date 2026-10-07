import type {
  Payment,
  PaymentStatus,
  CreatePaymentInput,
  UpdatePaymentInput,
  ApplyAdvanceInput,
  AdvanceAvailable
} from '~/modulos/erp/payments/types/payments.types'

const urlBase = '/api/backend/payments'
const urlDocsSales = '/api/backend/documents/sales'
const urlDocsPurchases = '/api/backend/documents/purchases'

export interface PendingDocument {
  id: string
  number: number | string
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
  source_type?: 'DOCUMENT' | 'TREASURY_OBLIGATION'
  obligation_id?: string
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
  available_amount?: number | null
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

  const findPendingPurchaseDocuments = async (partyId?: string) => {
    const [documents, obligations] = await Promise.all([
      $fetch<PendingDocument[]>(`${urlDocsPurchases}/pending`, {
        method: 'GET',
        query: partyId ? { party_id: partyId } : {}
      }),
      $fetch<any[]>('/api/backend/treasury/obligations', {
        method: 'GET',
        query: partyId ? { party_id: partyId } : {}
      }).catch(() => [])
    ])
    const payableObligations: PendingDocument[] = obligations
      .filter(row => row.treatment === 'DIRECT_EXPENSE' && !row.payment_id && !row.document_id && ['READY', 'OVERDUE'].includes(row.effective_status) && (!partyId || row.party_id === partyId))
      .map(row => {
        const amount = Number(row.amount ?? row.estimated_amount)
        return {
          id: row.id,
          obligation_id: row.id,
          source_type: 'TREASURY_OBLIGATION',
          number: row.period_key,
          date: row.issue_date ?? row.due_date,
          total: amount,
          paid_amount: 0,
          pending_amount: amount,
          currency_code: row.currency_code,
          exchange_rate: row.exchange_rate == null ? null : Number(row.exchange_rate),
          party_id: row.party_id,
          party_name: row.party?.name ?? null,
          party_type: row.party?.type ?? 'SUPPLIER',
          document_type_code: 'SERVICIO_IMPUESTO',
          document_type_description: row.description,
          document_type_category: 'TREASURY_OBLIGATION'
        }
      })
    return [...documents.map(document => ({ ...document, source_type: 'DOCUMENT' as const })), ...payableObligations]
  }

  const findAvailableChecks = () => {
    return $fetch<AvailableCheck[]>('/api/backend/checks/available', {
      method: 'GET'
    })
  }

  const findAvailableOwnChecks = () => {
    return $fetch<AvailableCheck[]>('/api/backend/checks/available', {
      method: 'GET',
      query: { is_own: 'true' }
    })
  }

  const findAvailableCustomerChecks = () => {
    return $fetch<AvailableCheck[]>('/api/backend/checks/available', {
      method: 'GET',
      query: { is_own: 'false' }
    })
  }

  const createLightCheck = (data: CreateCheckInput) => {
    return $fetch<AvailableCheck>('/api/backend/checks', {
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

  const reverse = (id: string, checkAction?: 'RETURN_TO_PORTFOLIO' | 'CANCEL') => {
    return $fetch<Payment>(`${urlBase}/${id}/reverse`, {
      method: 'POST',
      body: checkAction ? { check_action: checkAction } : {}
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
    findAvailableChecks,
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
