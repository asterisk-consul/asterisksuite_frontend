type ApiError = {
  data?: { data?: { message?: unknown }; message?: unknown }
  response?: { _data?: { message?: unknown }; data?: { message?: unknown } }
  message?: unknown
}

function asMessage(value: unknown): string | null {
  if (Array.isArray(value)) {
    const messages = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return messages.length ? messages.join(' · ') : null
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function getBusinessPartySaveError(error: unknown, storeError: unknown, fallback: string): string {
  const apiError = (error ?? {}) as ApiError
  const candidates = [
    apiError.data?.data?.message,
    apiError.data?.message,
    apiError.response?._data?.message,
    apiError.response?.data?.message,
    storeError,
    apiError.message,
  ]

  for (const candidate of candidates) {
    const message = asMessage(candidate)
    if (message) return message
  }

  return fallback
}
