import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

export function createDefaultProductForm(): CreateProductDto {
  return {
    name: '',
    sku: '',

    requires_refrigeration: false,

    price_enabled: true,

    is_rate_type: false,

    rate_id: undefined,

    taxId: undefined,

    active: true,

    product_type: 'FINISHED_PRODUCT',

    is_composed: false,

    auto_calculate_cost: false,

    has_engineering: false,

    manages_stock: true,

    income_account_id: undefined,
    expense_account_id: undefined,
    inventory_account_id: undefined,

    calculation_type: 'UNIT',

    cost_source: 'MANUAL'
  }
}
