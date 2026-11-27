/**
 * Lógica de selección automática de tipo de documento
 * según condición IVA del emisor y receptor (contexto argentino)
 *
 * Matriz ARCA vigente:
 *   Emisor       | Receptor        | Comprobante
 *   -------------|-----------------|-------------
 *   RI           | RI              | Factura A
 *   RI           | Monotributo     | Factura A
 *   RI           | Consumidor Final| Factura B
 *   RI           | Exento          | Factura B
 *   Monotributo  | *               | Factura C
 *   Exento       | *               | Factura C
 */

import { normalizeVatCondition } from '~/modulos/erp/fiscal/utils/vat-condition'

export type VatCondition = 'RI' | 'MONO' | 'CF' | 'EX'

export interface DocumentTypeMapping {
  saleType: string    // Tipo de factura de venta
  purchaseType: string // Tipo de factura de compra
  description: string
}

// Mapeo por condición del receptor (cuando emisor es RI)
/**
 * Obtiene el tipo de documento sugerido según condición IVA del emisor y receptor.
 *
 * Si falta la condición del tercero, no se sugiere una factura. Si no se informa
 * la condición de la empresa, se conserva el supuesto histórico de RI.
 */
export function getDocumentTypeForVatCondition(
  partnerCondition: VatCondition | string,
  direction: 'sale' | 'purchase',
  issuerCondition?: string | null
): string | null {
  let issuer: ReturnType<typeof normalizeVatCondition>
  let receiver: ReturnType<typeof normalizeVatCondition>

  if (direction === 'purchase') {
    // Compras: la parte interesada es el emisor y la empresa es el receptor.
    issuer = normalizeVatCondition(partnerCondition)
    receiver = normalizeVatCondition(issuerCondition ?? 'RESPONSABLE_INSCRIPTO')
  } else {
    // Ventas: la empresa es el emisor y el cliente es el receptor.
    issuer = normalizeVatCondition(issuerCondition ?? 'RESPONSABLE_INSCRIPTO')
    receiver = normalizeVatCondition(partnerCondition)
  }

  if (issuer === 'MONOTRIBUTO' || issuer === 'EXENTO') {
    return direction === 'sale' ? 'FC-A' : 'FC-C'
  }

  if (issuer !== 'RESPONSABLE_INSCRIPTO' || !receiver) return null

  const invoiceFamily = receiver === 'RESPONSABLE_INSCRIPTO' || receiver === 'MONOTRIBUTO'
    ? 'FA'
    : 'FB'
  return `${invoiceFamily}-${direction === 'sale' ? 'A' : 'C'}`
}

/**
 * Obtiene la descripción del mapeo
 */
export function getVatConditionDescription(vatCondition: VatCondition): string {
  const descriptions: Record<string, string> = {
    RI: 'Responsable Inscripto',
    MONO: 'Monotributista',
    CF: 'Consumidor Final',
    EX: 'Exento',
  }
  return descriptions[vatCondition] || 'No configurado'
}

/**
 * Lista de condiciones IVA con sus opciones
 */
export const VAT_CONDITIONS = [
  { value: 'RI', label: 'Responsable Inscripto', saleType: 'FA-A', purchaseType: 'FA-C' },
  { value: 'MONO', label: 'Monotributista', saleType: 'FA-A', purchaseType: 'FC-C' },
  { value: 'CF', label: 'Consumidor Final', saleType: 'FB-A', purchaseType: 'FB-C' },
  { value: 'EX', label: 'Exento', saleType: 'FB-A', purchaseType: 'FC-C' }
]
