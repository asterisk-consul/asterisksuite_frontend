export function formatMoneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '$0.00'

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor)
}

export type CurrencyAmount = number | string | null | undefined

export function formatCurrencyAmount(amount: CurrencyAmount, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency
  }).format(Number(amount) || 0)
}

export function formatCurrencyWhole(amount: CurrencyAmount, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Number(amount) || 0)
}
