import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'

import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

export type VariantCostSource = 'MANUAL' | 'PURCHASE' | 'IMPORT' | 'PRODUCTION'

export interface VariantCost {
  id: string

  variant_id: string

  currency_id: string

  source: VariantCostSource

  cost: number

  supplier?: string | null

  notes?: string | null

  currency?: Currency

  product_variant?: ProductVariant

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateVariantCostInput {
  variant_id: string

  currency_id: string

  source: VariantCostSource

  cost: number

  supplier?: string

  notes?: string
}

export interface UpdateVariantCostInput extends Partial<CreateVariantCostInput> {}
