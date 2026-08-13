/**
 * Utilidad centralizada de fechas para el frontend.
 * El backend envía ISO strings que representan hora de ARGENTINA.
 * Tratamos internamente todo como UTC para evitar conflictos con timezone del navegador.
 */

/**
 * Obtiene la hora actual en Argentina (UTC-3)
 */
function getArgentinaNow(): Date {
  const now = new Date()
  // Restar 3 horas al UTC actual para obtener Argentina time
  return new Date(now.getTime() - 3 * 60 * 60 * 1000)
}

/**
 * Parsea string del backend (ISO o YYYY-MM-DD) como hora ARGENTINA.
 * Si no hay hora, usa hora actual Argentina.
 */
export function parseLocalDateTime(dateStr?: string): Date {
  if (!dateStr) return getArgentinaNow()

  if (dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split('T')
    const [y, m, d] = datePart.split('-').map(Number)
    const [h, min, sec] = timePart.replace('Z', '').split(':').map(Number)

    // Si es medianoche (00:00), usar hora actual Argentina
    if (h === 0 && min === 0) {
      const argNow = getArgentinaNow()
      return new Date(Date.UTC(y, m - 1, d, argNow.getUTCHours(), argNow.getUTCMinutes(), argNow.getUTCSeconds()))
    }

    // Parsear como UTC (el backend ya mandó la hora de Argentina)
    return new Date(Date.UTC(y, m - 1, d, h, min, sec || 0))
  }

  // Solo fecha, sin hora → agregar hora actual Argentina
  const [y, m, d] = dateStr.split('-').map(Number)
  const argNow = getArgentinaNow()
  return new Date(Date.UTC(y, m - 1, d, argNow.getUTCHours(), argNow.getUTCMinutes(), argNow.getUTCSeconds()))
}

/**
 * Fecha actual Argentina en formato YYYY-MM-DD
 */
export function today(): string {
  const now = getArgentinaNow()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fecha y hora actual Argentina en ISO (YYYY-MM-DDTHH:MM:SS)
 */
export function nowISO(): string {
  const now = getArgentinaNow()
  const dateStr = today()
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  return `${dateStr}T${hours}:${minutes}:${seconds}`
}

/**
 * Formatea fecha para UI: dd/mm/yyyy
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDateTime(date) : date
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea fecha y hora para UI: dd/mm/yyyy HH:mm
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDateTime(date) : date
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}
