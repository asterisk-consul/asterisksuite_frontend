export const QUOTE_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'Enviado',
  2: 'Aprobado',
  3: 'Rechazado',
  4: 'Vencido',
  5: 'Convertido',
  6: 'Cancelado',
}

export const QUOTE_STATUS_DESCRIPTIONS: Record<number, string> = {
  0: 'Presupuesto creado, aún no enviado al cliente',
  1: 'Presupuesto enviado al cliente, esperando respuesta',
  2: 'Cliente aceptó el presupuesto',
  3: 'Cliente rechazó el presupuesto',
  4: 'Presupuesto vencido, validez expirada',
  5: 'Presupuesto convertido en Orden de Venta',
  6: 'Presupuesto cancelado',
}

export const ORDER_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'Aprobada',
  2: 'En Preparación',
  3: 'Lista Despacho',
  4: 'Parcial Entregada',
  5: 'Entregada',
  6: 'Facturada',
  7: 'Cerrada',
  8: 'Cancelada',
}

export const ORDER_STATUS_DESCRIPTIONS: Record<number, string> = {
  0: 'OV creada, aún no aprobada internamente',
  1: 'OV aprobada, pendiente de preparación',
  2: 'Se está preparando el despacho',
  3: 'Lista para ser despachada',
  4: 'Se entregó parcialmente al cliente',
  5: 'Todos los ítems fueron entregados',
  6: 'OV facturada completamente',
  7: 'OV cerrada definitivamente',
  8: 'OV cancelada',
}

export const REMITO_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'En Tránsito',
  2: 'Entregado',
  3: 'Cancelado',
}

export const REMITO_STATUS_DESCRIPTIONS: Record<number, string> = {
  0: 'Remito creado, aún no despachado',
  1: 'Mercadería en camino al cliente',
  2: 'Mercadería recibida por el cliente',
  3: 'Remito cancelado',
}

export const INVOICE_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'Pendiente',
  2: 'Confirmada',
  3: 'Anulada',
}

export const INVOICE_STATUS_DESCRIPTIONS: Record<number, string> = {
  0: 'Factura creada, aún no confirmada',
  1: 'Factura pendiente de confirmación fiscal',
  2: 'Factura confirmada con CAE válido',
  3: 'Factura anulada',
}

type BadgeColor = 'primary' | 'neutral' | 'secondary' | 'success' | 'info' | 'warning' | 'error'

export const QUOTE_STATUS_COLORS: Record<number, BadgeColor> = {
  0: 'neutral', 1: 'info', 2: 'success', 3: 'error', 4: 'warning', 5: 'secondary', 6: 'error',
}

export const ORDER_STATUS_COLORS: Record<number, BadgeColor> = {
  0: 'neutral', 1: 'info', 2: 'warning', 3: 'primary', 4: 'warning', 5: 'success', 6: 'success', 7: 'secondary', 8: 'error',
}

export const REMITO_STATUS_COLORS: Record<number, BadgeColor> = {
  0: 'neutral', 1: 'info', 2: 'success', 3: 'error',
}

export const INVOICE_STATUS_COLORS: Record<number, BadgeColor> = {
  0: 'neutral', 1: 'warning', 2: 'success', 3: 'error',
}

const STATUS_MAPS: Record<string, Record<number, string>> = {
  QUOTE: QUOTE_STATUSES, ORDER: ORDER_STATUSES, REMITO: REMITO_STATUSES,
  INVOICE: INVOICE_STATUSES, CREDIT_NOTE: INVOICE_STATUSES, DEBIT_NOTE: INVOICE_STATUSES,
}

const COLOR_MAPS: Record<string, Record<number, BadgeColor>> = {
  QUOTE: QUOTE_STATUS_COLORS, ORDER: ORDER_STATUS_COLORS, REMITO: REMITO_STATUS_COLORS,
  INVOICE: INVOICE_STATUS_COLORS, CREDIT_NOTE: INVOICE_STATUS_COLORS, DEBIT_NOTE: INVOICE_STATUS_COLORS,
}

export function getStatusLabel(category: string | null | undefined, status: number): string {
  return STATUS_MAPS[category ?? '']?.[status] ?? `Status ${status}`
}

export function getStatusColor(category: string | null | undefined, status: number): BadgeColor {
  return COLOR_MAPS[category ?? '']?.[status] ?? 'neutral'
}

const DESCRIPTION_MAPS: Record<string, Record<number, string>> = {
  QUOTE: QUOTE_STATUS_DESCRIPTIONS,
  ORDER: ORDER_STATUS_DESCRIPTIONS,
  REMITO: REMITO_STATUS_DESCRIPTIONS,
  INVOICE: INVOICE_STATUS_DESCRIPTIONS,
  CREDIT_NOTE: INVOICE_STATUS_DESCRIPTIONS,
  DEBIT_NOTE: INVOICE_STATUS_DESCRIPTIONS,
}

export function getStatusDescription(category: string | null | undefined, status: number): string {
  return DESCRIPTION_MAPS[category ?? '']?.[status] ?? ''
}

export function getValidTransitions(category: string | null | undefined, currentStatus: number): number[] {
  const transitions: Record<string, Record<number, number[]>> = {
    QUOTE: { 0: [1, 6], 1: [2, 3, 6], 2: [5] },
    ORDER: { 0: [1, 8], 1: [2, 8], 2: [3, 8], 3: [4, 5], 4: [5], 5: [7] },
    REMITO: { 0: [1, 3], 1: [2, 3] },
    INVOICE: { 0: [1, 3], 1: [2, 3] },
  }
  return transitions[category ?? '']?.[currentStatus] ?? []
}

// ─── Categorías de documento ───────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  QUOTE: 'Presupuestos',
  ORDER: 'Órdenes',
  REMITO: 'Remitos',
  INVOICE: 'Facturas',
  CREDIT_NOTE: 'Notas de crédito',
  DEBIT_NOTE: 'Notas de débito',
  RECEIPT: 'Recibos',
  OPENING_BALANCE: 'Saldo inicial',
  VALE: 'Vales',
}

const CATEGORY_STATUS_MAPS: Record<string, Record<number, string>> = {
  QUOTE: QUOTE_STATUSES,
  ORDER: ORDER_STATUSES,
  REMITO: REMITO_STATUSES,
  INVOICE: INVOICE_STATUSES,
  CREDIT_NOTE: INVOICE_STATUSES,
  DEBIT_NOTE: INVOICE_STATUSES,
  RECEIPT: INVOICE_STATUSES,
}

export function getCategoryStatuses(category: string | null | undefined): { value: number; label: string }[] {
  const map = CATEGORY_STATUS_MAPS[category ?? '']
  if (!map) return []
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: map[value] ?? `Status ${value}` }))
}
