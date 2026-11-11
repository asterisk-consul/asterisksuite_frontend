export type DocumentPaymentState = 'NOT_APPLICABLE' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'SETTLED_BY_CREDIT_NOTE'

export interface DocumentPaymentSummary {
  applies: boolean
  state: DocumentPaymentState
  total: number
  paid: number
  credited: number
  pending: number
  percentage: number
}

export function getDocumentPaymentSummary(document: any): DocumentPaymentSummary {
  const category = document?.document_types?.category
  const operation = document?.commercial_operation
  const basis = operation?.payment_document_basis
  const usesOperationBalance = category === 'ORDER' && (basis === 'ORDER' || basis === 'BOTH')
  // For OVs, the sales circuit is authoritative: do not show or settle an
  // order-level balance when the company records debt from invoices.
  const applies = category === 'ORDER'
    ? usesOperationBalance
    : category !== 'CREDIT_NOTE' && Boolean(document?.document_types?.affects_payment)
  const total = Math.max(0, Number(usesOperationBalance ? operation?.ordered_total : document?.total) || 0)
  const paid = Math.max(0, Number(usesOperationBalance ? operation?.paid_total : document?.paid_amount) || 0)
  const credited = Math.max(0, Number(usesOperationBalance
    ? operation?.credited_total
    : document?.credited_amount) || 0)
  const pending = Math.max(0, total - paid - credited)
  const percentage = total > 0 ? Math.min(100, ((paid + credited) / total) * 100) : 0

  let state: DocumentPaymentState = 'NOT_APPLICABLE'
  if (applies) {
    if (total > 0 && pending <= 0.01) {
      state = credited > 0.01 && paid < total - 0.01 ? 'SETTLED_BY_CREDIT_NOTE' : 'PAID'
    }
    else if (paid > 0.01) state = 'PARTIAL'
    else state = 'UNPAID'
  }

  return { applies, state, total, paid, credited, pending, percentage }
}

export function isDocumentFullyPaid(document: any) {
  const state = getDocumentPaymentSummary(document).state
  return state === 'PAID' || state === 'SETTLED_BY_CREDIT_NOTE'
}

export function canSettleDocument(document: any) {
  const summary = getDocumentPaymentSummary(document)
  const category = document?.document_types?.category
  const hasSettleableStatus = document?.status === 2 || (category === 'ORDER' && document?.status === 5)
  return hasSettleableStatus && summary.applies && summary.pending > 0.01
}
