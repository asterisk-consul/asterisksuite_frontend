import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import type {
  ProductType,
  UsageType,
  CalculationType,
  ProductCostSource,
  UpdateProductDto,
  CreateProductDto
} from '~/modulos/logistica/master-data/product/types/product.types'

export function createDefaultProductGeneral() {
  return {
    name: '',
    sku: '',
    active: true,

    product_type: 'FINISHED_PRODUCT' as ProductType,
    usage_type: 'BOTH' as UsageType,
    calculation_type: 'UNIT' as CalculationType
  }
}

export function createDefaultProductCosting() {
  return {
    price_enabled: true,
    auto_calculate_cost: false,
    cost_source: 'BOM' as ProductCostSource,
    cost_currency_id: undefined
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

// product-form.utils.ts — agregá esta función

export function toUpdateProductPayload(form: ProductFormState): UpdateProductDto {
  return {
    name: form.name,
    sku: form.sku,
    active: form.active,
    product_type: form.product_type,
    usage_type: form.usage_type,
    calculation_type: form.calculation_type,

    price_enabled: form.price_enabled,
    auto_calculate_cost: form.auto_calculate_cost,
    cost_source: form.cost_source,

    manages_stock: form.manages_stock,
    requires_refrigeration: form.requires_refrigeration,

    is_composed: form.is_composed,
    is_rate_type: form.is_rate_type,
    rate_id: form.rate_id,

    taxId: form.taxId,
    tax_category_id: form.tax_category_id,
    income_account_id: form.income_account_id,
    expense_account_id: form.expense_account_id,
    inventory_account_id: form.inventory_account_id
  }
}

export function toCreateProductPayload(form: ProductFormState): CreateProductDto {
  return {
    name: form.name,
    sku: form.sku,
    active: form.active,

    product_type: form.product_type,
    usage_type: form.usage_type,
    calculation_type: form.calculation_type,

    price_enabled: form.price_enabled,
    auto_calculate_cost: form.auto_calculate_cost,
    cost_source: form.cost_source,

    manages_stock: form.manages_stock,
    requires_refrigeration: form.requires_refrigeration,

    is_composed: form.is_composed,
    is_rate_type: form.is_rate_type,

    income_account_id: form.income_account_id,
    expense_account_id: form.expense_account_id,
    inventory_account_id: form.inventory_account_id,
    taxId: form.taxId,
    tax_category_id: form.tax_category_id
  }
}
