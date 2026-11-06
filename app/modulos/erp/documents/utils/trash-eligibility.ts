const ORPHAN_NOTE_CATEGORIES = new Set(['CREDIT_NOTE', 'DEBIT_NOTE'])

/**
 * Eligibility shown by the documents table and detail page.
 * The API repeats these checks transactionally before changing any balances.
 */
export function canSendDocumentToTrash(document: any): boolean {
  if (!document) return false

  const category = document.document_types?.category
  const status = Number(document.status)

  if (status === 0) return true
  if (category === 'INVOICE' && status === 3) return true

  if (![2, 3].includes(status) || !ORPHAN_NOTE_CATEGORIES.has(category)) return false

  const childCount = document._count?.child_documents ?? document.child_documents?.length
  const paymentCount = document._count?.payment_documents ?? document.payment_documents?.length
  if (childCount == null || paymentCount == null) return false

  return !document.parent_document_id
    && childCount === 0
    && paymentCount === 0
    && Number(document.paid_amount ?? 0) <= 0.01
    && !document.commercial_operation_id
    && !document.dispatch_order_id
}

export function isOrphanNoteTrashCandidate(document: any): boolean {
  return [2, 3].includes(Number(document?.status))
    && ORPHAN_NOTE_CATEGORIES.has(document?.document_types?.category)
    && canSendDocumentToTrash(document)
}
