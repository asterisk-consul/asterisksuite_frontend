export interface PriceList {
  id: string
  name: string
  type: string
  currency_id: string
  description?: string | null
  active: boolean
  created_at: string
  updated_at?: string | null

  currencies?: { id: string; code: string; symbol: string }
  _count?: { product_list_prices: number }
  product_list_prices?: ProductListPrice[]
}

export interface CreatePriceListInput {
  name: string
  type: string
  currency_id: string
  description?: string
  active?: boolean
}

export type UpdatePriceListInput = Partial<CreatePriceListInput>
