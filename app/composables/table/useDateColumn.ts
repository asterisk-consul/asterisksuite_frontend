import type { Row } from '@tanstack/vue-table'

export interface TableDateRange {
  start?: Date
  end?: Date
}

export function useDateColumn(locale = 'es-AR') {
  const meta = { filterType: 'date-range' as const }

  const filterFn = <TData>(
    row: Row<TData>,
    columnId: string,
    value: TableDateRange
  ) => {
    if (!value?.start && !value?.end) return true

    const raw = row.getValue<string>(columnId)
    if (!raw) return false

    const date = new Date(raw)

    // normalización (clave)
    const normalize = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const rowDate = normalize(date)

    const start = value.start ? normalize(new Date(value.start)) : null
    const end = value.end ? normalize(new Date(value.end)) : null

    if (start && rowDate < start) return false
    if (end && rowDate > end) return false

    return true
  }

  const format = (raw?: string) => {
    if (!raw) return '—'

    return new Date(raw).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return {
    meta,
    filterFn,
    format
  }
}
