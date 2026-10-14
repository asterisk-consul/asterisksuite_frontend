import type { BadgeColor } from '~/modulos/erp/documents/types/document-statuses'

export interface OrderFlowPresentation {
  label: string
  color: BadgeColor
  description: string
}

export function getOrderFlowPresentation(document: any): OrderFlowPresentation | null {
  if (!document || document.document_types?.category !== 'ORDER') return null

  const status = Number(document.status)
  if (status === 0) return { label: 'Borrador', color: 'neutral', description: 'La orden todavía debe confirmarse.' }
  if (status === 4) return { label: 'Parcialmente entregada', color: 'warning', description: 'Uno o más remitos confirmaron una entrega parcial.' }
  if (status === 5) return { label: 'Entregada', color: 'success', description: 'Los remitos confirmados completaron la entrega.' }
  if (status === 7) return { label: 'Cerrada', color: 'secondary', description: 'El circuito comercial de la orden está finalizado.' }
  if (status === 8) return { label: 'Cancelada', color: 'error', description: 'La orden fue anulada.' }

  const deliveryStatus = document.commercial_operation?.delivery_status
  if (deliveryStatus === 'ELIGIBLE') {
    return { label: 'Lista para despacho', color: 'primary', description: 'Se cumplieron las condiciones de cobro y facturación requeridas para generar el remito.' }
  }
  if (deliveryStatus === 'DRAFT_CREATED') {
    return { label: 'Remito pendiente', color: 'info', description: 'El remito ya fue generado y debe revisarse y confirmarse.' }
  }
  if (deliveryStatus === 'DELIVERED') {
    return { label: 'Entregada', color: 'success', description: 'El remito fue confirmado.' }
  }
  return { label: 'En preparación', color: 'warning', description: 'La orden está confirmada, pero todavía no cumple todas las condiciones para el despacho.' }
}
