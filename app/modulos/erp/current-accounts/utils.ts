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
  if (type === 'PAYMENT' || type === 'COLLECTION') return partyType === 'CUSTOMER' ? 'credit' : 'debit'
  if (type === 'OPENING_BALANCE') return partyType === 'CUSTOMER' ? 'debit' : 'credit'
  if (type === 'SUELDO') return 'credit'
  return 'debit'
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de crédito',
  DEBIT_NOTE: 'Nota de débito',
  PAYMENT: 'Pago',
  COLLECTION: 'Cobro',
  ADVANCE: 'Anticipo',
  OPENING_BALANCE: 'Saldo inicial',
  CHECK_ISSUED: 'Cheque emitido',
  CHECK_RECEIVED: 'Cheque recibido',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
  LOAN: 'Préstamo',
  LOAN_PAYMENT: 'Pago préstamo',
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

  const typeLabel = lastEntry ? (ENTRY_TYPE_LABELS[lastEntry.type] ?? lastEntry.type) : null
  const desc = lastEntry?.description
  const lastMovementLabel = desc
    ? `${typeLabel ?? 'Movimiento'}: ${desc}`
    : typeLabel ?? 'Movimiento registrado'

  return { days, label: `Hace ${days} día${days === 1 ? '' : 's'}`, color, lastMovementLabel }
}
