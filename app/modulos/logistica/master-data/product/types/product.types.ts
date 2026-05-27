// types/products.ts

export type ProductType =
  | 'RAW_MATERIAL'
  | 'FINISHED_PRODUCT'
  | 'SEMI_FINISHED'
  | 'SERVICE'
  | 'CONSUMABLE'

export type ProductCostSource =
  | 'MANUAL'
  | 'PURCHASE'
  | 'ENGINEERING'
  | 'BOM'
  | 'RATE'

export type CalculationType = 'UNIT' | 'SURFASE' | 'VOLUME' | 'LINEAR'

import type { Account } from '~/modulos/contabilidad/types/accounts.types'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'
import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'
import type { ProductAttributeValue } from '~/modulos/logistica/master-data/product-attribute-values/types/product-attribute-values.types'
import type { ProductComponent } from '~/modulos/logistica/master-data/product-components/types/product-components.types'
import type { TransferRate } from '~/modulos/logistica/transport/transfer-rates/transfer-rates.types'
import type { ProductPrice } from '~/modulos/logistica/master-data/product-price/types/product-price.types'

export interface ProductRoot {
  id: string
  name: string
  sku?: string
}

export interface ProductTax {
  id: string
  product_id: string
  tax_id: string
  rate: number

  // opcional
  is_default?: boolean
}

export interface Product {
  id: string

  name: string
  sku?: string | null

  requires_refrigeration?: boolean | null
  price_enabled: boolean

  is_rate_type: boolean
  rate_id?: string | null

  taxId?: string | null

  active?: boolean | null

  product_type: ProductType

  is_composed: boolean
  auto_calculate_cost: boolean
  has_engineering: boolean

  manages_stock: boolean

  income_account_id?: string | null
  expense_account_id?: string | null
  inventory_account_id?: string | null

  calculation_type?: CalculationType | null

  created_at: string
  updated_at?: string | null
  deleted_at?: string | null

  created_by?: string | null
  updated_by?: string | null
  deleted_by?: string | null

  cost_source: ProductCostSource

  needs_cost_recalculation: boolean

  last_cost_calculated_at?: string | null

  current_cost?: number | null

  // ─────────────────────────────
  // Relaciones
  // ─────────────────────────────

  product_variants?: ProductVariant[]

  parent_components?: ProductComponent[]
  child_components?: ProductComponent[]

  product_categories?: {
    category_id: string
    categories: Category
  }[]

  product_tags?: ProductTag[]

  product_attribute_values?: ProductAttributeValue[]

  product_price?: ProductPrice[]

  // ESTO ES LO QUE TE FALTABA
  product_taxes?: ProductTax[]

  income_account?: Account | null
  expense_account?: Account | null
  inventory_account?: Account | null

  transfer_rate?: TransferRate | null

  // custom backend
  root_products?: RootProductReference[]
}

export interface RootProductReference {
  id: string
  name: string
  sku: string
  level: number
}

export interface CreateProductDto {
  name: string

  sku?: string

  requires_refrigeration?: boolean

  price_enabled?: boolean

  is_rate_type?: boolean
  rate_id?: string

  taxId?: string

  active?: boolean

  product_type?: ProductType

  is_composed?: boolean

  auto_calculate_cost?: boolean

  has_engineering?: boolean

  manages_stock?: boolean

  income_account_id?: string
  expense_account_id?: string
  inventory_account_id?: string

  calculation_type?: CalculationType

  cost_source?: ProductCostSource
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export type CreateProductInput = Omit<
  Product,
  'id' | 'created_at' | 'updated_at'
>

export type UpdateProductInput = Partial<CreateProductInput>
