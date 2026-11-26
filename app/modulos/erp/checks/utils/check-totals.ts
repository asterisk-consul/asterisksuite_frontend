import type { CheckAlertTotal } from '../types/check-alerts.types'

export function sumCheckTotals(checks: readonly { amount: number | string; currency_code?: string | null }[]): CheckAlertTotal[] {
  const centsByCurrency = new Map<string, number>()
  for (const check of checks) {
    const currency = check.currency_code?.trim().toUpperCase() || 'ARS'
    const amount = Number(check.amount)
    if (!Number.isFinite(amount)) continue
    centsByCurrency.set(currency, (centsByCurrency.get(currency) ?? 0) + Math.round(amount * 100))
  }
  return [...centsByCurrency].sort(([a], [b]) => a.localeCompare(b))
    .map(([currency_code, cents]) => ({ currency_code, amount: cents / 100 }))
}
