import type { Product } from '~/modulos/logistica/master-data/product/product.types'

import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

import type { Unit } from '~/modulos/almacen/units/types/units.types'

export interface EngineeringComponent {
  id?: string

  parent_product_id: string

  child_product_id: string

  child_variant_id?: string

  quantity: number

  unit_id?: string

  length_mm?: number

  width_mm?: number

  height_mm?: number

  waste_percentage?: number

  active?: boolean

  child_product?: Product

  child_variant?: ProductVariant

  unit?: Unit
}

export interface EngineeringTree {
  product_id: string

  product?: Product

  quantity?: number

  children: EngineeringTree[]

  component?: EngineeringComponent

  totals?: {
    total_cost?: number

    total_weight?: number

    total_components?: number
  }
}

export interface EngineeringCalculation {
  total_cost?: number

  total_weight?: number

  total_components?: number

  breakdown?: {
    product_id: string

    product_name?: string

    quantity: number

    unit_cost?: number

    subtotal?: number
  }[]
}

export interface CreateEngineeringComponentInput {
  parent_product_id: string

  child_product_id: string

  child_variant_id?: string

  quantity: number

  unit_id?: string

  length_mm?: number

  width_mm?: number

  height_mm?: number

  waste_percentage?: number

  active?: boolean
}
