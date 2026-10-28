const fieldLabels: Record<string, string> = {
  document_type_id: 'Tipo de comprobante',
  party_id: 'Cliente o proveedor',
  date: 'Fecha',
  descrip: 'Referencia',
  ref: 'Referencia externa',
  document_sequence_id: 'Punto de venta',
  confirmed_delivery_date: 'Fecha confirmada de entrega',
  items: 'Productos o conceptos',
  quantity: 'Cantidad',
  unit_price: 'Precio unitario',
  currency_code: 'Moneda',
}

function formatValidationMessage(value: unknown): string[] {
  if (typeof value === 'string') {
    const match = value.match(/^([a-zA-Z0-9_.]+)\s+(.+)$/)
    if (!match) return [value]
    const label = fieldLabels[match[1]]
    if (!label) return [value]
    const rule = match[2]
    if (rule.includes('valid ISO 8601 date')) return [`${label}: ingresá una fecha válida.`]
    if (rule.includes('UUID')) return [`${label}: seleccioná un valor válido.`]
    if (rule.includes('shorter than or equal to')) return [`${label}: el texto supera el máximo permitido.`]
    if (rule.includes('must be a number') || rule.includes('must be numeric')) return [`${label}: ingresá un número válido.`]
    if (rule.includes('must not be empty')) return [`${label}: este dato es obligatorio.`]
    return [`${label}: ${rule}`]
  }

  if (value && typeof value === 'object') {
    const detail = value as { property?: string; constraints?: Record<string, string> }
    const label = fieldLabels[detail.property ?? '']
    const constraint = Object.values(detail.constraints ?? {})[0]
    if (label && constraint) {
      const text = constraint.startsWith(`${detail.property} `) ? constraint : `${detail.property} ${constraint}`
      return formatValidationMessage(text)
    }
  }

  return []
}

export function getDocumentSubmitError(error: any, fallback = 'No se pudo guardar el comprobante.'): string {
  const status = Number(error?.statusCode ?? error?.status ?? error?.response?.status ?? 0)
  const body = error?.data?.data ?? error?.data ?? error?.response?._data
  const message = body?.message ?? error?.message

  if (status >= 500) {
    return `${fallback} El servidor encontró un error inesperado. Verificá si el documento quedó creado antes de volver a intentarlo.`
  }
  if (Array.isArray(message)) {
    const details = [...new Set(message.flatMap(formatValidationMessage))]
    if (details.length) return details.join(' · ')
  }
  if (typeof message === 'string' && message.trim() && message !== 'Internal server error') {
    return message
  }
  return fallback
}
