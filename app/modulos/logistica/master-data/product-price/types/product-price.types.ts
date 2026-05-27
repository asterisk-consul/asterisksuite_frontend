import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

export interface ProductPrice {
  id: string

  product_id: string

  currency_id: string

  price: number

  exemption_rate: number

  created_at: string
  updated_at?: string | null

  deleted_at?: string | null

  created_by?: string | null
  updated_by?: string | null
  deleted_by?: string | null

  currencies?: Currency

  products?: Product
}

// =========================
// INPUTS
// =========================

export interface CreateProductPriceInput {
  product_id: string

  currency_id: string

  price: number

  exemption_rate?: number
}

export interface UpdateProductPriceInput {
  price?: number

  exemption_rate?: number
}
