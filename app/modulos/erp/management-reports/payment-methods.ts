/** Etiquetas en español de los medios de pago usados por cobros y pagos. */
import type { ManagementReportPaymentDestination } from './management-reports.types'

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  BANK_TRANSFER: 'Transferencia',
  MIXED: 'Mixto',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  VIRTUAL_WALLET: 'Billetera virtual',
  PAYROLL_DEDUCTION: 'Descuento de haberes',
}

export const PAYMENT_METHOD_UNKNOWN_LABEL = 'Sin informar'

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return PAYMENT_METHOD_UNKNOWN_LABEL
  return PAYMENT_METHOD_LABELS[method] ?? method
}

export const paymentMethodFilterOptions = [
  ...Object.values(PAYMENT_METHOD_LABELS),
  PAYMENT_METHOD_UNKNOWN_LABEL,
]

/** Nombre visible de la cuenta bancaria o caja receptora del cobro. */
export function paymentDestinationLabel(destination: ManagementReportPaymentDestination): string | null {
  if (destination.bank_account) {
    const account = destination.bank_account.account_number || destination.bank_account.alias || destination.bank_account.name
    return [destination.bank_account.bank_name, account].filter(Boolean).join(' — ')
  }
  if (destination.cash_box) return destination.cash_box.name
  return null
}

/** Texto de una fila para mostrar, buscar y ordenar en el detalle de Cobros. */
export function paymentDestinationDisplay(destinations?: ManagementReportPaymentDestination[] | null): string {
  if (!destinations?.length) return PAYMENT_METHOD_UNKNOWN_LABEL
  return destinations
    .map((destination) => paymentDestinationLabel(destination) ?? paymentMethodLabel(destination.method))
    .join(' · ')
}
