export interface CurrencyInfo {
  code?: string
  symbol?: string
}

export interface TreeNodeData {
  child_product?: {
    calculation_type?: string
    current_cost?: string | null
    current_cost_currency?: CurrencyInfo | null
  }
  child_variant?: {
    thickness_mm?: string | null
    density_kg_m3?: string | null
    weight_per_meter_kg?: string | null
  } | null
  productVariantCosts?: Array<{ cost: string | number; currency?: CurrencyInfo | null }>
  resolvedVariantCost?: {
    original_cost?: number | string
    converted_cost?: number | string
    original_currency_code?: string
    original_currency_symbol?: string
  } | null
  quantity?: string | number
  length_mm?: string | number | null
  width_mm?: string | number | null
  height_mm?: string | number | null
  waste_percentage?: string | number | null
}

export interface NodeCalculations {
  surface_m2: number
  volume_m3: number
  calculated_weight_kg: number
  unit_cost: number
  total_cost: number
  unit_currency: CurrencyInfo | null
}

export type EngineeringCalcMode = 'BOM' | 'ENGINEERING'

const safeNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

const resolveUnitCost = (node: TreeNodeData): { cost: number; currency: CurrencyInfo | null } => {
  // 1. Costo de variante ya convertido a la moneda del árbol (backend).
  const resolved = node.resolvedVariantCost
  if (resolved && resolved.converted_cost != null) {
    return { cost: safeNumber(resolved.converted_cost), currency: null }
  }

  // 2. Costo de variante en su moneda original.
  const first = node.productVariantCosts?.[0]
  if (first) {
    return { cost: safeNumber(first.cost), currency: first.currency ?? null }
  }

  // 3. Fallback: costo actual del producto.
  return {
    cost: safeNumber(node.child_product?.current_cost),
    currency: node.child_product?.current_cost_currency ?? null
  }
}

export const computeNodeCalculations = (
  node: TreeNodeData,
  mode: EngineeringCalcMode = 'ENGINEERING'
): NodeCalculations => {
  // En modo BOM el backend trata todos los nodos como UNIT (cantidad × costo).
  if (mode === 'BOM') return computeUnit(node)

  const calcType = node.child_product?.calculation_type ?? 'UNIT'
  const wastePct = safeNumber(node.waste_percentage)

  switch (calcType) {
    case 'SURFACE':
      return computeSurface(node, wastePct)
    case 'LINEAR':
      return computeLinear(node, wastePct)
    case 'VOLUME':
      return computeVolume(node, wastePct)
    case 'UNIT':
    default:
      return computeUnit(node)
  }
}

function computeUnit(node: TreeNodeData): NodeCalculations {
  const quantity = safeNumber(node.quantity)
  const { cost: unitCost, currency } = resolveUnitCost(node)
  return {
    surface_m2: 0,
    volume_m3: 0,
    calculated_weight_kg: 0,
    unit_cost: unitCost,
    total_cost: quantity * unitCost,
    unit_currency: currency,
  }
}

function computeSurface(node: TreeNodeData, wastePct: number): NodeCalculations {
  const variant = node.child_variant
  const thicknessM = safeNumber(variant?.thickness_mm) / 1000
  const densityKgM3 = safeNumber(variant?.density_kg_m3)
  const lengthMm = safeNumber(node.length_mm)
  const widthMm = safeNumber(node.width_mm)

  const pieces = safeNumber(node.quantity)
  const areaM2 = (lengthMm / 1000) * (widthMm / 1000) * pieces
  const volumeM3 = areaM2 * thicknessM
  const rawWeightKg = volumeM3 * densityKgM3
  const finalWeightKg = rawWeightKg * (1 + wastePct / 100)

  const { cost: unitCost, currency } = resolveUnitCost(node)
  const totalCost = finalWeightKg * unitCost

  return {
    surface_m2: areaM2,
    volume_m3: volumeM3,
    calculated_weight_kg: finalWeightKg,
    unit_cost: unitCost,
    total_cost: totalCost,
    unit_currency: currency,
  }
}

function computeLinear(node: TreeNodeData, wastePct: number): NodeCalculations {
  const variant = node.child_variant
  const lengthMm = safeNumber(node.length_mm)
  const lengthM = lengthMm / 1000
  const pieces = safeNumber(node.quantity)
  const finalLength = lengthM * pieces * (1 + wastePct / 100)
  const weightPerMeterKg = safeNumber(variant?.weight_per_meter_kg)
  const finalWeightKg = finalLength * weightPerMeterKg

  const { cost: unitCost, currency } = resolveUnitCost(node)
  const totalCost = finalLength * unitCost

  return {
    surface_m2: 0,
    volume_m3: 0,
    calculated_weight_kg: finalWeightKg,
    unit_cost: unitCost,
    total_cost: totalCost,
    unit_currency: currency,
  }
}

function computeVolume(node: TreeNodeData, wastePct: number): NodeCalculations {
  const lengthM = safeNumber(node.length_mm) / 1000
  const widthM = safeNumber(node.width_mm) / 1000
  const heightM = safeNumber(node.height_mm) / 1000
  const volumeM3 = lengthM * widthM * heightM
  const pieces = safeNumber(node.quantity)
  const finalVolume = volumeM3 * pieces * (1 + wastePct / 100)

  const { cost: unitCost, currency } = resolveUnitCost(node)
  const totalCost = finalVolume * unitCost

  return {
    surface_m2: 0,
    volume_m3: finalVolume,
    calculated_weight_kg: 0,
    unit_cost: unitCost,
    total_cost: totalCost,
    unit_currency: currency,
  }
}
