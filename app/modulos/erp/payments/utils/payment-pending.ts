import type { Payment } from '../types/payments.types'

export function isAvailableAdvance(payment: Payment): boolean {
  if (payment.deleted_at || payment.source_kind || !payment.party_id || payment.payment_mode !== 'ADVANCE'
    || !['CONFIRMED', 'PAID'].includes(payment.status)) return false
  const applied = (payment.documents ?? []).reduce((sum, link) => sum + Number(link.amount_applied || 0), 0)
  return Math.round((Number(payment.amount) - applied) * 100) > 1
}
