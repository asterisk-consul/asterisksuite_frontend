export type DocumentPaymentState = 'NOT_APPLICABLE' | 'UNPAID' | 'PARTIAL' | 'PAID'

export interface DocumentPaymentSummary {
  applies: boolean
  state: DocumentPaymentState
  total: number
  paid: number
  pending: number
  percentage: number
}

export function getDocumentPaymentSummary(document: any): DocumentPaymentSummary {
  const category = document.document_types?.category
  const operation = document.commercial_operation
  const basis = operation?.payment_document_basis
  const usesOperationBalance = category === 'ORDER' && (basis === 'ORDER' || basis === 'BOTH')
  const applies = Boolean(document.document_types?.affects_payment || usesOperationBalance)
  const total = Math.max(0, Number(usesOperationBalance ? operation?.ordered_total : document.total) || 0)
  const paid = Math.max(0, Number(usesOperationBalance ? operation?.paid_total : document.paid_amount) || 0)
  const pending = Math.max(0, total - paid)
  const percentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0

  let state: DocumentPaymentState = 'NOT_APPLICABLE'
  if (applies) {
    if (total > 0 && pending <= 0.01) state = 'PAID'
    else if (paid > 0.01) state = 'PARTIAL'
    else state = 'UNPAID'
  }

  return { applies, state, total, paid, pending, percentage }
}

export function isDocumentFullyPaid(document: any) {
  return getDocumentPaymentSummary(document).state === 'PAID'
}

export function canSettleDocument(document: any) {
  const summary = getDocumentPaymentSummary(document)
  return document?.status === 2 && summary.applies && summary.pending > 0.01
}
