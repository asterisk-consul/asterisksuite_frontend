/**
 * Lógica de selección automática de tipo de documento
 * según condición IVA del cliente/proveedor (contexto argentino)
 * 
 * Mapeo AFIP:
 * - Responsable Inscripto (RI) → Factura A (IVA discriminado)
 * - Monotributista (MONO) → Factura C (sin IVA)
 * - Consumidor Final (CF) → Factura B (IVA incluido)
 * - Exento (EX) → Factura C (sin IVA)
 */

export type VatCondition = 'RI' | 'MONO' | 'CF' | 'EX'

export interface DocumentTypeMapping {
  saleType: string    // Tipo de factura de venta
  purchaseType: string // Tipo de factura de compra
  description: string
}

// Mapeo: Condición IVA → Tipo de documento
const VAT_TO_DOCUMENT_MAP: Record<VatCondition, DocumentTypeMapping> = {
  RI: {
    saleType: 'FA-A',      // Factura A (IVA discriminado)
    purchaseType: 'FA-C',  // Factura A Compra
    description: 'Responsable Inscripto → Factura A'
  },
  MONO: {
    saleType: 'FC-A',      // Factura C (sin IVA)
    purchaseType: 'FC-C',  // Factura C Compra
    description: 'Monotributista → Factura C'
  },
  CF: {
    saleType: 'FB-A',      // Factura B (IVA incluido)
    purchaseType: 'FB-C',  // Factura B Compra
    description: 'Consumidor Final → Factura B'
  },
  EX: {
    saleType: 'FC-A',      // Factura C (exento)
    purchaseType: 'FC-C',  // Factura C Compra
    description: 'Exento → Factura C'
  }
}

/**
 * Obtiene el tipo de documento sugerido según la condición IVA
 */
export function getDocumentTypeForVatCondition(
  vatCondition: VatCondition,
  direction: 'sale' | 'purchase'
): string {
  const mapping = VAT_TO_DOCUMENT_MAP[vatCondition]
  if (!mapping) return direction === 'sale' ? 'FA-A' : 'FA-C'
  return direction === 'sale' ? mapping.saleType : mapping.purchaseType
}

/**
 * Obtiene la descripción del mapeo
 */
export function getVatConditionDescription(vatCondition: VatCondition): string {
  return VAT_TO_DOCUMENT_MAP[vatCondition]?.description || 'No configurado'
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
