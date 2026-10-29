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
  WITHHOLDING: 'Retención practicada',
  COLLECTION: 'Cobro',
  ADVANCE: 'Anticipo',
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
  const desc = lastEntry?.description
  const lastMovementLabel = desc
    ? `${typeLabel ?? 'Movimiento'}: ${desc}`
    : typeLabel ?? 'Movimiento registrado'

  return { days, label: `Hace ${days} día${days === 1 ? '' : 's'}`, color, lastMovementLabel }
}
