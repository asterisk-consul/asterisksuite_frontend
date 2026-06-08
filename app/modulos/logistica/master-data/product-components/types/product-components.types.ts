import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'
import type { Unit } from '~/modulos/almacen/units/types/units.types'

// ─────────────────────────────────────────────────────────
// Tipo liviano para evitar referencia circular con Product
// Solo los campos que el backend retorna en el include
// ─────────────────────────────────────────────────────────
export interface ProductComponentRef {
  id: string
  name: string
  sku?: string | null
}

export interface ProductComponent {
  id: string

  parent_product_id: string
  child_product_id: string
  child_variant_id?: string | null
  unit_id?: string | null

  quantity: number

  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  calculated_weight_kg?: number | null
  waste_percentage?: number | null

  active?: boolean

  // ← liviano en vez de Product completo (evita circular + matchea el select del backend)
  parent_product?: ProductComponentRef
  child_product?: ProductComponentRef

  child_variant?: ProductVariant
  units?: Unit

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateProductComponentInput {
  parent_product_id: string
  child_product_id: string
  child_variant_id?: string
  unit_id?: string
  quantity: number
  length_mm?: number
  width_mm?: number
  height_mm?: number
  calculated_weight_kg?: number
  waste_percentage?: number
  active?: boolean
}

export interface UpdateProductComponentInput extends Partial<CreateProductComponentInput> {}
