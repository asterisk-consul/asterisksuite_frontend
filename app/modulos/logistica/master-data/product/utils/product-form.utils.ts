import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import type {
  ProductType,
  CalculationType,
  ProductCostSource
} from '~/modulos/logistica/master-data/product/types/product.types'

export interface ProductGeneralFormState {
  name: string
  sku: string
  product_type?: ProductType
  calculation_type?: CalculationType
  active: boolean
}

export function createDefaultProductGeneral() {
  return {
    name: '',
    sku: '',
    active: true,

    product_type: 'FINISHED_PRODUCT' as ProductType,
    calculation_type: 'UNIT' as CalculationType
  }
}

export function createDefaultProductCosting() {
  return {
    price_enabled: true,
    auto_calculate_cost: false,

    cost_source: 'MANUAL' as ProductCostSource
  }
}

export function createDefaultProductInventory() {
  return {
    manages_stock: true,
    requires_refrigeration: false
  }
}

export function createDefaultProductEngineering() {
  return {
    is_composed: false,
    has_engineering: false,
    is_rate_type: false
  }
}

export function createDefaultProductRelations() {
  return {
    category_ids: [],
    tag_ids: []
  }
}

export function createDefaultProductForm(): ProductFormState {
  return {
    ...createDefaultProductGeneral(),
    ...createDefaultProductInventory(),
    ...createDefaultProductCosting(),
    ...createDefaultProductEngineering(),
    ...createDefaultProductRelations()
  }
}
