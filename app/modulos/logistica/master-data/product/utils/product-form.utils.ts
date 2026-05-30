import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

export function createDefaultProductForm(): ProductFormState {
  return {
    name: '',

    sku: '',

    requires_refrigeration: false,

    price_enabled: true,

    is_rate_type: false,

    active: true,

    product_type: 'FINISHED_PRODUCT',

    is_composed: false,

    auto_calculate_cost: false,

    has_engineering: false,

    manages_stock: true,

    calculation_type: 'UNIT',

    cost_source: 'MANUAL',

    // =========================
    // RELATIONS
    // =========================

    category_ids: [],
    tag_ids: []
  }
}
