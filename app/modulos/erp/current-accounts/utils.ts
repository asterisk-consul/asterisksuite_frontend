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
  if (type === 'SUELDO') return 'credit'
  return 'debit'
}
