export interface ProductListPrice {
  id: string
  price_list_id: string
  product_id: string
  price: string
  margin_percentage?: string | null
  active: boolean
  created_at: string
  updated_at?: string | null

  price_lists?: {
    id: string
    name: string
    type: string
    currencies?: { code: string; symbol: string }
  }
  products?: { id: string; name: string; sku?: string | null }
}

export interface CreateListPriceInput {
  price_list_id: string
  product_id: string
  price: string
  margin_percentage?: string
  active?: boolean
}

export type UpdateListPriceInput = Partial<Omit<CreateListPriceInput, 'price_list_id' | 'product_id'>>
