/** Interpreta los filtros avanzados y rápidos usados en las tablas de reportes. */
export function reportTableFilter(row: any, columnId: string, rawFilter: unknown): boolean {
  if (rawFilter === undefined || rawFilter === null || rawFilter === '') return true

  const isFilterObject = typeof rawFilter === 'object' && rawFilter !== null
  const filter = isFilterObject ? rawFilter as { operator?: string; value?: unknown; start?: string; end?: string } : undefined
  const operator = filter?.operator ?? 'contains'
  const query = filter && 'value' in filter ? filter.value : rawFilter
  const value = row.getValue(columnId)

  if (query === undefined || query === null || query === '') return true

  if (operator === 'between') {
    const range = (query && typeof query === 'object' ? query : filter) as { start?: string; end?: string } | undefined
    if (!range?.start && !range?.end) return true
    const date = new Date(String(value)).getTime()
    const start = range.start ? new Date(range.start).getTime() : Number.NEGATIVE_INFINITY
    const end = range.end ? new Date(`${range.end}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
    return Number.isFinite(date) && date >= start && date <= end
  }

  if (operator === 'gt' || operator === 'lt') {
    const actual = Number(value)
    const expected = Number(query)
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false
    return operator === 'gt' ? actual > expected : actual < expected
  }

  if (operator === 'in') {
    return Array.isArray(query) && query.some(item => String(item) === String(value))
  }

  if (typeof value === 'number' && (operator === 'equals' || typeof query === 'number')) {
    return operator === 'equals' ? value === Number(query) : String(value).includes(String(query))
  }

  const actual = String(value ?? '').trim().toLocaleLowerCase('es-AR')
  const expected = String(query).trim().toLocaleLowerCase('es-AR')

  switch (operator) {
    case 'equals':
      return actual === expected
    case 'startsWith':
      return actual.startsWith(expected)
    case 'endsWith':
      return actual.endsWith(expected)
    default:
      return actual.includes(expected)
  }
}
