import type { CurrentAccountEntry, CurrentAccountEntryPayment, CurrentAccountPaymentCheck } from './types/current-accounts.types'

/**
 * Determina si una entrada es débito o crédito según el tipo de movimiento y el tipo de parte.
 *
 * Convención contable:
 * - CLIENTE: Factura = Débito (nos deben), Cobro = Crédito (nos pagaron)
 * - PROVEEDOR/EMPLEADO/SOCIO: Factura = Crédito (les debemos), Pago = Débito (les pagamos)
 */
export function resolveSide(type: string, partyType?: string): 'debit' | 'credit' {
  if (type === 'INVOICE') return partyType === 'CUSTOMER' ? 'debit' : 'credit'
  if (type === 'CREDIT_NOTE') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'ORDER_INVOICE_REPLACEMENT') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'ORDER_INVOICE_REPLACEMENT_REVERSAL') return partyType === 'CUSTOMER' ? 'debit' : 'credit'
  if (type === 'PAYMENT' || type === 'COLLECTION') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'ADVANCE') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'WITHHOLDING') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'PAYROLL_DEDUCTION') return 'debit'
  if (type === 'OPENING_BALANCE') return partyType === 'CUSTOMER' ? 'debit' : 'credit'
  if (type === 'SUELDO') return 'credit'
  return 'debit'
}

export function resolveEntrySide(
  entry: { type: string; balance_before?: number | string | null; balance_after?: number | string | null },
  partyType?: string
): 'debit' | 'credit' {
  if (entry.balance_before != null && entry.balance_after != null) {
    const change = Number(entry.balance_after) - Number(entry.balance_before)
    if (Math.abs(change) > 0.000001) {
      if (partyType === 'CUSTOMER') return change > 0 ? 'debit' : 'credit'
      return change > 0 ? 'credit' : 'debit'
    }
  }
  return resolveSide(entry.type, partyType)
}

/** El concepto del vale describe la operación; ingreso/egreso describe su efecto monetario. */
export function resolveHrValeLabel(
  entry: { type: string; vale_type?: string | null; vale_status?: string | null; description?: string | null },
  partyType?: string,
  showPending = true
): string | undefined {
  if (!['VALE_DEBIT', 'VALE_CREDIT'].includes(entry.type)) return undefined
  if (!['EMPLOYEE', 'PARTNER'].includes(partyType ?? '')) return undefined
  const pending = showPending && entry.vale_status === 'CONFIRMED' ? ' · A pagar' : ''
  if (partyType === 'EMPLOYEE') return `Vale empleado${pending}`
  const concept = entry.vale_type ?? entry.description?.match(/^(?:Vale #\d+\s*[-·]\s*)?(RETIRO|APORTE|REEMBOLSO|PRESTAMO)\b/)?.[1]
  const labels: Record<string, string> = { RETIRO: 'Retiro', APORTE: 'Aporte', REEMBOLSO: 'Reembolso', PRESTAMO: 'Préstamo' }
  return labels[concept ?? ''] ?? `Vale socio${pending}`
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de crédito',
  ORDER_INVOICE_REPLACEMENT: 'Reemplazo OV → factura',
  ORDER_INVOICE_REPLACEMENT_REVERSAL: 'Reversión reemplazo OV → factura',
  DEBIT_NOTE: 'Nota de débito',
  PAYMENT: 'Pago',
  VALE_DEBIT: 'Vale · egreso',
  VALE_CREDIT: 'Vale · ingreso',
  WITHHOLDING: 'Retención',
  COLLECTION: 'Cobro',
  ADVANCE: 'A cuenta',
  OPENING_BALANCE: 'Saldo inicial',
  CHECK_ISSUED: 'Cheque emitido',
  CHECK_RECEIVED: 'Cheque recibido',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
  LOAN: 'Préstamo',
  LOAN_PAYMENT: 'Pago préstamo',
  PAYROLL_DEDUCTION: 'Descuento de haberes',
  SUELDO: 'Recibo de sueldo',
  NO_DEBIT: 'No débito',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
}

export interface ActivityInfo {
  days: number | null
  label: string
  color: 'success' | 'warning' | 'error' | 'neutral'
  lastMovementLabel: string
}

export function resolveCurrentAccountDescription(description: string | null | undefined): string | null {
  if (!description) return description ?? null
  return description.replace(/^Anticipo(?=\s+#\d+\s+aplicado\b)/i, 'A cuenta')
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  BANK_TRANSFER: 'Transferencia bancaria',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  VIRTUAL_WALLET: 'Billetera virtual',
  PAYROLL_DEDUCTION: 'Descuento por recibo',
  MIXED: 'Mixto',
}

export function resolveCurrentAccountPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'No informado'
  return PAYMENT_METHOD_LABELS[method] ?? method
}

export function getCurrentAccountPaymentChecks(payment?: CurrentAccountEntryPayment | null): CurrentAccountPaymentCheck[] {
  const checks = new Map<string, CurrentAccountPaymentCheck>()
  for (const allocation of payment?.payment_allocations ?? []) {
    if (allocation.check) checks.set(allocation.check.id, allocation.check)
  }
  for (const check of payment?.checks ?? []) checks.set(check.id, check)
  return [...checks.values()]
}

export function resolveCurrentAccountPaymentMethodSummary(payment?: CurrentAccountEntryPayment | null): string {
  if (!payment) return 'No informado'
  if (payment.payment_method !== 'MIXED') return resolveCurrentAccountPaymentMethod(payment.payment_method)
  const methods = [...new Set((payment.tenders ?? []).map(tender => resolveCurrentAccountPaymentMethod(tender.method)))]
  return methods.length ? `Mixto (${methods.join(' + ')})` : 'Mixto'
}

export function resolveCurrentAccountPaymentDescription(entry: CurrentAccountEntry): string {
  const description = resolveCurrentAccountDescription(entry.description)
  const payment = entry.payment
  if (!payment) return description ?? ''

  const operation = payment.type === 'COLLECTION' ? 'Cobro' : 'Pago'
  const parts = [`${operation} #${payment.number}`, `Medio: ${resolveCurrentAccountPaymentMethodSummary(payment)}`]
  const checkNumbers = getCurrentAccountPaymentChecks(payment).map(check => check.check_number)
  if (checkNumbers.length) parts.push(`Cheque N.º ${checkNumbers.join(', ')}`)

  const context = description?.replace(
    new RegExp(`^A cuenta\\s+#${payment.number}\\s+aplicado\\s+a\\s*`, 'i'),
    'Aplicado a ',
  )
  const isRedundantPaymentLabel = new RegExp(`^(?:Pago|Cobro)\\s+#${payment.number}$`, 'i').test(context?.trim() ?? '')
  if (context && !isRedundantPaymentLabel) {
    parts.push(context)
  }
  return parts.join(' · ')
}

export function getActivityInfo(lastEntryDate: string | null | undefined, lastEntry?: { type: string; description: string | null } | null): ActivityInfo {
  if (!lastEntryDate) {
    return { days: null, label: 'Sin actividad', color: 'neutral', lastMovementLabel: 'Sin movimientos' }
  }

  const now = new Date()
  const entryDate = new Date(lastEntryDate + 'T00:00:00')
  const diffMs = now.getTime() - entryDate.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let color: 'success' | 'warning' | 'error' = 'success'
  if (days > 60) color = 'error'
  else if (days > 15) color = 'warning'

  const typeLabel = lastEntry
    ? lastEntry.type === 'ADJUSTMENT' && lastEntry.description?.startsWith('Anulación Vale #')
      ? 'Anulación de vale'
      : ENTRY_TYPE_LABELS[lastEntry.type] ?? lastEntry.type
    : null
  const desc = resolveCurrentAccountDescription(lastEntry?.description)
  const lastMovementLabel = desc
    ? `${typeLabel ?? 'Movimiento'}: ${desc}`
    : typeLabel ?? 'Movimiento registrado'

  return { days, label: `Hace ${days} día${days === 1 ? '' : 's'}`, color, lastMovementLabel }
}
