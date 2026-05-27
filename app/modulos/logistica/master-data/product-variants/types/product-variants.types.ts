import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

import type { ProductAttributeValue } from '../../product-attribute-values/types/product-attribute-values.types'
import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'

export interface ProductVariantPrice {
  id: string

  variant_id: string

  currency_id: string

  price: number

  price_list?: string | null

  margin?: number | null

  active: boolean

  currency?: Currency

  created_at?: string

  updated_at?: string | null

  deleted_at?: string | null
}

/* =========================================
 * VARIANT COST
 * ========================================= */

export type VariantCostSource =
  | 'MANUAL'
  | 'PURCHASE'
  | 'IMPORT'
  | 'ENGINEERING'
  | 'SUPPLIER'

export interface ProductVariantCost {
  id: string

  variant_id: string

  currency_id: string

  source: VariantCostSource

  cost: number

  effective_date: string

  supplier?: string | null

  notes?: string | null

  active: boolean

  currency?: Currency

  created_at?: string

  updated_at?: string | null

  deleted_at?: string | null
}

/* =========================================
 * PRODUCT VARIANT
 * ========================================= */

export interface ProductVariant {
  id: string

  product_id: string

  name?: string | null

  sku?: string | null

  thickness_mm?: number | null

  density_kg_m3?: number | null

  weight_kg?: number | null

  active?: boolean

  // RELATIONS
  products?: Product

  product_attribute_values?: ProductAttributeValue[]

  productVariantPrices?: ProductVariantPrice[]

  productVariantCosts?: ProductVariantCost[]

  // AUDIT
  created_at?: string

  updated_at?: string | null

  deleted_at?: string | null
}

/* =========================================
 * CREATE INPUT
 * ========================================= */

export interface CreateProductVariantInput {
  product_id: string

  name?: string

  sku?: string

  thickness_mm?: number

  density_kg_m3?: number

  weight_kg?: number

  active?: boolean
}

/* =========================================
 * UPDATE INPUT
 * ========================================= */

export interface UpdateProductVariantInput extends Partial<CreateProductVariantInput> {}
