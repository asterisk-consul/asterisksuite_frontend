export interface CostHistoryBreakdown {
  id: string
  product_cost_id: string
  component_product_id: string
  component_variant_id: string | null
  quantity: string
  unit_cost: string
  total_cost: string
  level: number
  created_at: string
  component_product: {
    name: string
    sku: string | null
  }
  component_variant: {
    name: string | null
    sku: string | null
  } | null
}

export interface CostHistoryRow {
  id: string
  version: number
  cost_source: ProductCostSource
  material_cost: string
  labor_cost: string
  overhead_cost: string
  total_cost: string
  active: boolean
  notes: string | null
  created_at: string
  cost_template_id: string | null
  cost_rates_snapshot: Record<string, CostRateSnapshot> | null
  currencies: {
    code: string
    symbol: string
    name: string
  }
  products: {
    name: string
    sku: string | null
  }
  breakdowns: CostHistoryBreakdown[]
}

export interface CostRateSnapshot {
  name: string
  type: string
  value_type: string
  rate_used: number
  cost_applied: number
}

export interface CalculatedCost {
  product_id: string
  material_cost: number
  labor_cost: number
  overhead_cost: number
  other_cost: number
  total_cost: number
  rates_snapshot: Record<string, CostRateSnapshot>
  cost_template_id: string | null
}

export interface ParetoItem {
  product_id: string
  variant_id: string | null
  product_name: string
  product_sku: string | null
  variant_name: string | null
  variant_sku: string | null
  total_quantity: number
  total_cost: number
  percentage: number
  cumulative: number
  is_vital: boolean
  occurrences: number
  cost_source?: string
}

export interface CostParetoResult {
  product_id: string
  currency_id: string
  total_cost: number
  items: ParetoItem[]
  vital_items_count: number
  vital_items_percentage: number
}

export interface CalculateProductCostDto {
  product_id: string
  currency_id: string
  save_snapshot?: boolean
}

export type ProductCostSource = 'MANUAL' | 'BOM' | 'ENGINEERING' | 'PURCHASE' | 'RATE'

export type ParetoMode = 'materials' | 'full' | 'assemblies'
