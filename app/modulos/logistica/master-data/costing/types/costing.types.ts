export type ProductCostSource = 'MANUAL' | 'PURCHASE' | 'ENGINEERING' | 'BOM'

export interface CostBreakdownItem {
  component_product_id?: string

  component_variant_id?: string

  quantity: number

  unit_cost: number

  total_cost: number

  level: number
}

export interface ProductCostCalculation {
  product_id: string

  material_cost: number

  labor_cost: number

  overhead_cost: number

  total_cost: number

  breakdown?: any[]
}

export interface ProductCostHistory {
  id: string

  product_id: string

  currency_id: string

  cost_source: ProductCostSource

  material_cost: number

  labor_cost: number

  overhead_cost: number

  total_cost: number

  created_at: string

  breakdowns?: CostBreakdownItem[]

  currencies?: any
}

export interface CalculateProductCostInput {
  product_id: string

  currency_id: string

  save_snapshot?: boolean
}

export interface UpdateManualCostInput {
  current_cost: number

  cost_source?: ProductCostSource
}
