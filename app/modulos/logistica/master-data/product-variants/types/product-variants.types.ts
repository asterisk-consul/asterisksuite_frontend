import type { Product } from '~/modulos/logistica/master-data/product/product.types'

import type { ProductAttributeValue } from '../../product-attribute-values/types/product-attribute-values.types'

export interface ProductVariant {
  id: string

  product_id: string

  name?: string | null

  sku?: string | null

  thickness_mm?: number | null

  density_kg_m3?: number | null

  weight_kg?: number | null

  cost_price?: number | null

  sale_price?: number | null

  active?: boolean

  products?: Product

  product_attribute_values?: ProductAttributeValue[]

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateProductVariantInput {
  product_id: string

  name?: string

  sku?: string

  thickness_mm?: number

  density_kg_m3?: number

  weight_kg?: number

  cost_price?: number

  sale_price?: number

  active?: boolean
}

export interface UpdateProductVariantInput extends Partial<CreateProductVariantInput> {}
