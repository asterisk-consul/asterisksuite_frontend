// types/products.ts

export type ProductType = 'RAW_MATERIAL' | 'FINISHED_PRODUCT' | 'SEMI_FINISHED' | 'SERVICE' | 'RATES'

export type UsageType = 'SALE' | 'PURCHASE' | 'BOTH'

export type ProductCostSource = 'MANUAL' | 'PURCHASE' | 'ENGINEERING' | 'BOM' | 'RATE'

export type CalculationType = 'UNIT' | 'SURFACE' | 'VOLUME' | 'LINEAR'

import type { Account } from '~/modulos/contabilidad/types/accounts.types'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import type { Unit } from '~/modulos/almacen/units/types/units.types'
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
  tax_category_id?: string | null
  tax_category?: {
    id: string
    code: string
    name: string
  } | null

  active?: boolean | null

  product_type: ProductType
  usage_type: UsageType
  cost_template_id?: string | null

  is_composed: boolean
  auto_calculate_cost: boolean

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

  current_cost?: number | string | null

  unit_id?: string | null

  // relaciones

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

  product_taxes?: ProductTax[]

  product_costs?: ProductCost[] // 👈 NUEVO

  income_account?: Account | null
  expense_account?: Account | null
  inventory_account?: Account | null

  transfer_rate?: TransferRate | null

  unit?: Unit | null

  root_products?: RootProductReference[]
}

export interface ProductCostCard {
  id: string
  sku: string
  name: string

  current_cost?: number | string | null

  currency?: {
    id: string
    code: string
    name: string
    symbol: string
  }
}

export interface RootProductReference {
  id: string
  name: string
  sku: string
  level: number
}
export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
}

export interface ProductCost {
  id?: string

  currency_id?: string
  total_cost?: number | string

  currencies?: Currency
}

export interface CreateProductDto {
  name: string

  sku?: string
  requires_refrigeration?: boolean
  price_enabled?: boolean

  is_rate_type?: boolean
  rate_id?: string

  taxId?: string
  tax_category_id?: string

  active?: boolean

  product_type?: ProductType

  is_composed?: boolean
  auto_calculate_cost?: boolean
  manages_stock?: boolean

  income_account_id?: string
  expense_account_id?: string
  inventory_account_id?: string

  calculation_type?: CalculationType
  cost_source?: ProductCostSource

  unit_id?: string
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export type UpdateProductInput = Partial<CreateProductInput>
