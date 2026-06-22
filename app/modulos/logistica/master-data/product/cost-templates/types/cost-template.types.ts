export type CostComponentType = 'MATERIAL' | 'LABOR' | 'OVERHEAD' | 'OTHER'

export type CostValueType = 'FROM_BOM' | 'PERCENTAGE_OF_MATERIAL' | 'PERCENTAGE_OF_TOTAL' | 'FIXED_PER_UNIT'

export interface CostComponent {
  id: string
  name: string
  type: CostComponentType
  value_type: CostValueType
  value: number | null
  order: number
  active: boolean
  created_at: string
  updated_at: string | null
}

export interface CostTemplateComponent {
  id: string
  template_id: string
  cost_component_id: string
  value_override: number | null
  order: number
  component: CostComponent
}

export interface CostTemplate {
  id: string
  name: string
  description: string | null
  is_default: boolean
  active: boolean
  created_at: string
  updated_at: string | null
  components: CostTemplateComponent[]
}

export interface CreateCostComponentDto {
  name: string
  type: CostComponentType
  value_type: CostValueType
  value?: number
  order?: number
}

export interface CreateCostTemplateDto {
  name: string
  description?: string
  is_default?: boolean
  components: {
    cost_component_id: string
    value_override?: number
    order: number
  }[]
}

export interface UpdateCostTemplateDto {
  name?: string
  description?: string
  is_default?: boolean
}

export interface UpdateTemplateComponentDto {
  value_override?: number | null
  order?: number
}

export interface AddTemplateComponentDto {
  cost_component_id: string
  value_override?: number
  order: number
}

// Labels para la UI
export const COST_COMPONENT_TYPE_LABELS: Record<CostComponentType, string> = {
  MATERIAL: 'Material',
  LABOR: 'Mano de obra',
  OVERHEAD: 'Costos indirectos',
  OTHER: 'Otros'
}

export const COST_VALUE_TYPE_LABELS: Record<CostValueType, string> = {
  FROM_BOM: 'Desde BOM',
  PERCENTAGE_OF_MATERIAL: '% sobre material',
  PERCENTAGE_OF_TOTAL: '% sobre total',
  FIXED_PER_UNIT: 'Monto fijo por unidad'
}
export const COST_COMPONENT_TYPE_COLORS = {
  MATERIAL: 'info',
  LABOR: 'success',
  OVERHEAD: 'warning',
  OTHER: 'neutral'
} as const
