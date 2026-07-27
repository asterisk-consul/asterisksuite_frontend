/**
 * Lógica de selección automática de tipo de documento
 * según condición IVA del emisor y receptor (contexto argentino)
 *
 * Matriz AFIP:
 *   Emisor       | Receptor        | Comprobante
 *   -------------|-----------------|-------------
 *   RI           | RI              | Factura A
 *   RI           | Monotributo     | Factura B
 *   RI           | Consumidor Final| Factura B
 *   RI           | Exento          | Factura B
 *   Monotributo  | *               | Factura C
 *   Exento       | *               | Factura C
 */

export type VatCondition = 'RI' | 'MONO' | 'CF' | 'EX'

export interface DocumentTypeMapping {
  saleType: string    // Tipo de factura de venta
  purchaseType: string // Tipo de factura de compra
  description: string
}

// Mapeo por condición del receptor (cuando emisor es RI)
const PARTNER_VAT_TO_SALE_MAP: Record<string, string> = {
  RI: 'FA-A',
  RESPONSABLE_INSCRIPTO: 'FA-A',
  MONO: 'FB-A',
  MONOTRIBUTO: 'FB-A',
  CF: 'FB-A',
  'CONSUMIDOR FINAL': 'FB-A',
  EX: 'FB-A',
  EXENTO: 'FB-A',
}

const PARTNER_VAT_TO_PURCHASE_MAP: Record<string, string> = {
  RI: 'FA-C',
  RESPONSABLE_INSCRIPTO: 'FA-C',
  MONO: 'FB-C',
  MONOTRIBUTO: 'FB-C',
  CF: 'FB-C',
  'CONSUMIDOR FINAL': 'FB-C',
  EX: 'FB-C',
  EXENTO: 'FB-C',
}

/**
 * Obtiene el tipo de documento sugerido según condición IVA del emisor y receptor.
 *
 * Si no se provee issuerCondition, se asume RI (comportamiento legacy).
 */
export function getDocumentTypeForVatCondition(
  partnerCondition: VatCondition,
  direction: 'sale' | 'purchase',
  issuerCondition?: string | null
): string {
  const issuer = (issuerCondition ?? 'RI').toUpperCase()

  // Emisor Monotributo o Exento → siempre Factura C
  if (issuer === 'MONOTRIBUTO' || issuer === 'EXENTO') {
    return direction === 'sale' ? 'FC-A' : 'FC-C'
  }

  // Emisor RI → mapear según receptor
  const map = direction === 'sale' ? PARTNER_VAT_TO_SALE_MAP : PARTNER_VAT_TO_PURCHASE_MAP
  return map[partnerCondition.toUpperCase()] ?? (direction === 'sale' ? 'FB-A' : 'FB-C')
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
  { value: 'MONO', label: 'Monotributista', saleType: 'FC-A', purchaseType: 'FC-C' },
  { value: 'CF', label: 'Consumidor Final', saleType: 'FB-A', purchaseType: 'FB-C' },
  { value: 'EX', label: 'Exento', saleType: 'FC-A', purchaseType: 'FC-C' }
]
