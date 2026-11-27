const TASK_DURATION_UNITS: Record<string, number> = { w: 5 * 8 * 60, d: 8 * 60, h: 60, m: 1 }
const MAX_TASK_DURATION_MINUTES = 525600

export function parseTaskDuration(value: string): number | null {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, '')
  if (!normalized) return null
  if (/^\d+$/.test(normalized)) {
    const minutes = Number(normalized)
    return Number.isSafeInteger(minutes) && minutes <= MAX_TASK_DURATION_MINUTES ? minutes : null
  }
  const tokens = [...normalized.matchAll(/(\d+)([wdhm])/g)]
  if (!tokens.length || tokens.map(token => token[0]).join('') !== normalized) return null
  const units = tokens.map(token => token[2]!)
  if (new Set(units).size !== units.length) return null
  const minutes = tokens.reduce((sum, token) => sum + Number(token[1]) * TASK_DURATION_UNITS[token[2]!], 0)
  return Number.isSafeInteger(minutes) && minutes <= MAX_TASK_DURATION_MINUTES ? minutes : null
}

export function formatTaskDuration(minutes: number | null | undefined): string {
  let remaining = Math.max(0, Math.floor(minutes ?? 0))
  const parts: string[] = []
  for (const [unit, size] of Object.entries(TASK_DURATION_UNITS)) {
    const value = Math.floor(remaining / size)
    if (value) parts.push(`${value}${unit}`)
    remaining %= size
  }
  return parts.join(' ') || '0m'
}

export function taskDurationInput(minutes: number | null | undefined): string {
  return minutes == null ? '' : formatTaskDuration(minutes)
}
