import { addDaysToDateKey, getArgentinaDateKey, getCheckDateKey } from './check-dates'

export const CHECK_ALERT_DAYS_STORAGE_KEY = 'treasury.checkAlertDays'
export const DEFAULT_CHECK_ALERT_DAYS = 30
export type CheckOwnership = 'own' | 'third-party'

export function normalizeCheckAlertDays(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null || raw === '') return DEFAULT_CHECK_ALERT_DAYS
  const days = Math.trunc(Number(raw))
  return Number.isFinite(days) ? Math.min(365, Math.max(1, days)) : DEFAULT_CHECK_ALERT_DAYS
}

export function parseCheckOwnership(value: unknown): CheckOwnership | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'own' || raw === 'third-party' ? raw : null
}

type UpcomingCheck = { status: string; is_own: boolean; due_date: string | Date }

/** Mismo grupo para los contadores del dashboard y la cartera enlazada. */
export function filterUpcomingChecks<T extends UpcomingCheck>(
  checks: readonly T[],
  days: number,
  ownership: CheckOwnership | null = null,
  today = getArgentinaDateKey(),
): T[] {
  const limit = addDaysToDateKey(today, normalizeCheckAlertDays(days))
  return checks.filter(check => {
    if (!['PENDING', 'CONFIRMED'].includes(check.status)) return false
    if (ownership === 'own' && !check.is_own || ownership === 'third-party' && check.is_own) return false
    const due = getCheckDateKey(check.due_date)
    return due > today && due <= limit
  })
}
