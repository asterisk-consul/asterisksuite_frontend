export interface ProductSupplier {
  id: string
  product_id: string
  supplier_id: string
  purchase_price: string
  currency_id: string
  lead_time_days?: number | null
  min_order_quantity?: string | null
  is_primary: boolean
  active: boolean
  created_at: string
  updated_at?: string | null

  products?: { id: string; name: string; sku?: string | null }
  business_parties?: { id: string; name: string; tax_id?: string | null }
  currencies?: { id: string; code: string; symbol: string }
}

export interface CreateProductSupplierInput {
  product_id: string
  supplier_id: string
  purchase_price: string
  currency_id: string
  lead_time_days?: number
  min_order_quantity?: string
  is_primary?: boolean
  active?: boolean
}

export type UpdateProductSupplierInput = Partial<Omit<CreateProductSupplierInput, 'product_id' | 'supplier_id'>>
