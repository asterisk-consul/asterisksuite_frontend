const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

function parseDateKey(value: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new RangeError(`Fecha inválida: ${value}`)
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

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
  const [year, month, day] = parseDateKey(getCheckDateKey(value))
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: monthStyle,
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day))).replace('.', '')
}

export function addDaysToDateKey(value: string, days: number): string {
  const [year, month, day] = parseDateKey(value)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function differenceInDateKeys(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = parseDateKey(from)
  const [toYear, toMonth, toDay] = parseDateKey(to)
  const fromTimestamp = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const toTimestamp = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((toTimestamp - fromTimestamp) / 86_400_000)
}
