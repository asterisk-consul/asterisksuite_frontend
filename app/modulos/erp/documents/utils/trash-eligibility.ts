const NOTE_CATEGORIES = new Set(['CREDIT_NOTE', 'DEBIT_NOTE'])

/**
 * Eligibility shown by the documents table and detail page.
 * The API repeats these checks transactionally before changing any balances.
 */
export function canSendDocumentToTrash(document: any): boolean {
  if (!document) return false

  const category = document.document_types?.category
  const status = Number(document.status)
  const childCount = document._count?.child_documents ?? document.child_documents?.length

  // An invoice remains in the active chain while it has any child document.
  if (category === 'INVOICE' && childCount > 0) return false

  if (status === 0) return true
  if (category === 'INVOICE' && status === 3) return true

  if (status !== 3 || !NOTE_CATEGORIES.has(category)) return false

  const paymentCount = document._count?.payment_documents ?? document.payment_documents?.length
  if (childCount == null || paymentCount == null) return false

  const hasFiscalAuthorization = Boolean(
    document.fiscal_authorization_id
    || document.fiscal_authorization_type
    || document.fiscal_authorization_code
    || document.fiscal_authorization_expires_at
    || (document.fiscal_authorization_range_from !== null && document.fiscal_authorization_range_from !== undefined)
    || (document.fiscal_authorization_range_to !== null && document.fiscal_authorization_range_to !== undefined),
  )

  return (!document.parent_document_id || (document.source === 'manual' && !hasFiscalAuthorization))
    && childCount === 0
    && paymentCount === 0
    && Number(document.paid_amount ?? 0) <= 0.01
    && !document.commercial_operation_id
    && !document.dispatch_order_id
}

export function isCancelledNoteTrashCandidate(document: any): boolean {
  return Number(document?.status) === 3
    && NOTE_CATEGORIES.has(document?.document_types?.category)
    && canSendDocumentToTrash(document)
}
