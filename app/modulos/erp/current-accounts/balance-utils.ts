import { resolveSide } from './utils'

/**
 * BalanceUtils — ÚNICA fuente de verdad para lógica de débito/crédito/saldos.
 *
 * Regla contable:
 * - CUSTOMER: positivo = a cobrar (me deben), negativo = a pagar (les debo)
 * - SUPPLIER: positivo = a pagar (les debo), negativo = saldo a favor (les deben)
 * - EMPLOYEE: positivo = a pagar (les debo), negativo = saldo a favor (les deben)
 * - PARTNER:  positivo = a pagar (les debo), negativo = saldo a favor (les deben)
 */

// ═══════════════════════════════════════════
// CLASIFICACIÓN
// ═══════════════════════════════════════════

/** ¿El saldo es "a cobrar" (favorable)? */
export function isReceivable(balance: number, partyType?: string): boolean {
  if (partyType === 'CUSTOMER') return balance > 0
  return balance < 0
}

/** ¿El saldo es "a pagar" (desfavorable)? */
export function isPayable(balance: number, partyType?: string): boolean {
  if (partyType === 'CUSTOMER') return balance < 0
  return balance > 0
}

/** Clasificar cuenta en columna */
export function classifyAccount(balance: number, partyType?: string): 'receivable' | 'payable' {
  return isReceivable(balance, partyType) ? 'receivable' : 'payable'
}

// ═══════════════════════════════════════════
// COLORES CSS
// ═══════════════════════════════════════════

/** Clase CSS para el saldo (text-success / text-error / text-muted) */
export function balanceColorClass(balance: number, partyType?: string): string {
  if (balance === 0) return 'text-muted'
  return isReceivable(balance, partyType) ? 'text-success' : 'text-error'
}

/** Clase CSS para monto en listas */
export function balanceAmountClass(balance: number, partyType?: string): string {
  return balanceColorClass(balance, partyType)
}

// ═══════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════

/** Label descriptivo del saldo */
export function balanceLabel(balance: number, partyType?: string): string {
  if (balance === 0) return 'Saldo 0'
  return isReceivable(balance, partyType)
    ? (partyType === 'CUSTOMER' ? 'A cobrar' : 'Saldo a favor')
    : 'A pagar'
}

// ═══════════════════════════════════════════
// COLORES HEX (para gráficos)
// ═══════════════════════════════════════════

/** Color hex para línea de evolución del saldo */
export function balanceChartColor(balance: number, partyType?: string): string {
  return isReceivable(balance, partyType) ? '#22c55e' : '#ef4444'
}

/** Color hex para área del gráfico */
export function balanceChartAreaColor(balance: number, partyType?: string): string {
  return isReceivable(balance, partyType) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
}

/** Color hex para entradas individuales (gráfico de torta) */
export function entryChartColor(type: string, partyType?: string): string {
  const side = resolveSide(type, partyType)
  if (partyType === 'CUSTOMER') {
    return side === 'debit' ? '#22c55e' : '#ef4444'
  }
  return side === 'credit' ? '#ef4444' : '#22c55e'
}

// ═══════════════════════════════════════════
// COLORES DE CARDS (crédito/débito)
// ═══════════════════════════════════════════

/** Color de la card de Total Crédito */
export function creditCardColor(partyType?: string): string {
  return partyType === 'CUSTOMER' ? 'text-success' : 'text-error'
}

/** Color de la card de Total Débito */
export function debitCardColor(partyType?: string): string {
  return partyType === 'CUSTOMER' ? 'text-error' : 'text-success'
}

/** Background del ícono de Total Crédito */
export function creditCardBg(partyType?: string): string {
  return partyType === 'CUSTOMER' ? 'bg-success/10' : 'bg-error/10'
}

/** Background del ícono de Total Débito */
export function debitCardBg(partyType?: string): string {
  return partyType === 'CUSTOMER' ? 'bg-error/10' : 'bg-success/10'
}

// ═══════════════════════════════════════════
// ICONO DE BALANCE
// ═══════════════════════════════════════════

/** Background del ícono de saldo neto */
export function balanceIconBg(balance: number, partyType?: string): string {
  return isReceivable(balance, partyType) ? 'bg-success/10' : 'bg-error/10'
}

/** Color del ícono de saldo neto */
export function balanceIconColor(balance: number, partyType?: string): string {
  return isReceivable(balance, partyType) ? 'text-success' : 'text-error'
}

// ═══════════════════════════════════════════
// INFO DE SALDO (para cards)
// ═══════════════════════════════════════════

type BalancePriority = 'primary' | 'secondary' | 'none'

export function getBalanceInfo(balance: number, partyType?: string): {
  label: string
  color: string
  priority: BalancePriority
} {
  if (balance === 0) return { label: 'Saldo cero', color: 'neutral', priority: 'none' }

  if (partyType === 'CUSTOMER') {
    if (balance > 0) return { label: 'A cobrar', color: 'success', priority: 'primary' }
    return { label: 'A pagar', color: 'error', priority: 'secondary' }
  }

  // SUPPLIER / EMPLOYEE / PARTNER
  if (balance > 0) return { label: 'A pagar', color: 'error', priority: 'primary' }
  return { label: 'Saldo a favor', color: 'success', priority: 'secondary' }
}
