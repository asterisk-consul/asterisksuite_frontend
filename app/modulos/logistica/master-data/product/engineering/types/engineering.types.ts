export interface EngineeringMaterial {
  product_id: string
  variant_id: string | null
  product_name: string
  quantity: number
  unit: string | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  calculated_weight_kg: number | null
  waste_percentage: number | null
}

export interface EngineeringTreeNode {
  id: string
  parent_product_id: string
  child_product_id: string
  child_variant_id: string | null
  quantity: number
  unit_id: string | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  calculated_weight_kg: number | null
  waste_percentage: number | null
  active: boolean
  child_product: {
    id: string
    name: string
    sku: string | null
    product_type: string
    cost_source: string
    is_composed: boolean
    current_cost: string | null
  }
  child_variant: {
    id: string
    name: string | null
    sku: string | null
    thickness_mm: string | null
    weight_kg: string | null
  } | null
  units: {
    id: string
    name: string
    symbol: string
  } | null
  children?: EngineeringTreeNode[]
}

export interface EngineeringCalculationResult {
  materials: EngineeringMaterial[]
  total_items: number
}

export interface CreateEngineeringComponentDto {
  parent_product_id: string
  child_product_id: string
  child_variant_id?: string
  quantity: number
  unit_id?: string
  length_mm?: number
  width_mm?: number
  height_mm?: number
  waste_percentage?: number
}
