/**
 * Lógica de retenciones para pagos (contexto argentino)
 * 
 * Las retenciones se aplican solo cuando:
 * 1. El proveedor es agente de retención
 * 2. El monto supera el mínimo según la jurisdicción
 * 3. La operación corresponde al tipo de retención
 */

export interface RetentionConfig {
  code: string
  name: string
  rate: number
  minAmount: number
  appliesTo: 'ALL' | 'SERVICES' | 'GOODS'
}

export interface SupplierRetentionInfo {
  retention_agent: boolean
  iibb_registered: boolean
  province?: string
  operation_type?: string
}

// Configuración de retenciones por defecto (configurable)
export const RETENTION_CONFIGS: RetentionConfig[] = [
  {
    code: 'RET_IVA',
    name: 'Retención IVA',
    rate: 3.0,
    minAmount: 10000,
    appliesTo: 'ALL'
  },
  {
    code: 'RET_IIBB',
    name: 'Retención IIBB',
    rate: 2.5,
    minAmount: 10000,
    appliesTo: 'ALL'
  },
  {
    code: 'RET_GANANCIAS',
    name: 'Retención Ganancias',
    rate: 1.0,
    minAmount: 50000,
    appliesTo: 'SERVICES'
  },
  {
    code: 'RET_SUSS',
    name: 'Retención SUSS',
    rate: 1.0,
    minAmount: 10000,
    appliesTo: 'SERVICES'
  }
]

/**
 * Calcula las retenciones aplicables a un pago
 */
export function calculateRetentions(
  paymentAmount: number,
  supplierInfo: SupplierRetentionInfo
): { code: string; name: string; amount: number }[] {
  const retentions: { code: string; name: string; amount: number }[] = []

  // Solo aplicar retenciones si el proveedor es agente de retención
  if (!supplierInfo.retention_agent) {
    return retentions
  }

  for (const config of RETENTION_CONFIGS) {
    // Verificar si el monto supera el mínimo
    if (paymentAmount < config.minAmount) {
      continue
    }

    // Verificar si aplica al tipo de operación
    if (config.appliesTo !== 'ALL') {
      if (config.appliesTo === 'SERVICES' && supplierInfo.operation_type !== 'SERVICE') {
        continue
      }
      if (config.appliesTo === 'GOODS' && supplierInfo.operation_type !== 'GOODS') {
        continue
      }
    }

    // Calcular monto de retención
    const retentionAmount = Math.round(paymentAmount * (config.rate / 100) * 100) / 100

    retentions.push({
      code: config.code,
      name: config.name,
      amount: retentionAmount
    })
  }

  return retentions
}

/**
 * Calcula el total de retenciones
 */
export function calculateTotalRetentions(
  retentions: { code: string; name: string; amount: number }[]
): number {
  return retentions.reduce((sum, r) => sum + r.amount, 0)
}

/**
 * Calcula el monto real que recibe el proveedor
 */
export function calculateNetAmount(
  paymentAmount: number,
  totalRetentions: number
): number {
  return paymentAmount - totalRetentions
}
