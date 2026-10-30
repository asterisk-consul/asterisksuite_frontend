const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function getArgentinaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/** Prisma serializes PostgreSQL @db.Date values as ISO timestamps at UTC midnight. */
export function getCheckDateKey(value: string | Date): string {
  const serialized = value instanceof Date ? value.toISOString() : value
  const dateOnly = serialized.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (dateOnly) return dateOnly

  return getArgentinaDateKey(new Date(serialized))
}

export function formatCheckDate(value: string | Date, monthStyle: '2-digit' | 'short' = '2-digit'): string {
  const [year, month, day] = getCheckDateKey(value).split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: monthStyle,
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day))).replace('.', '')
}

export function addDaysToDateKey(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function differenceInDateKeys(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  const fromTimestamp = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const toTimestamp = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((toTimestamp - fromTimestamp) / 86_400_000)
}
