export interface SalesProductsGroupRow {
  key: string
  category: string
  category_path: string
  point_of_sale: string
  document_count: number
  line_count: number
  product_count: number
  quantity: string
  subtotal: string
  vat: string
  line_total: string
  percent_of_company_total: string
  products?: SalesProductsProductRow[]
}

export interface SalesProductsProductRow {
  key: string
  product_key: string
  product_id: string | null
  product_name: string
  sku: string
  document_count: number
  line_count: number
  quantity: string
  subtotal: string
  vat: string
  line_total: string
}

export interface SalesProductsCurrencySummary {
  currency_code: string
  document_count: number
  line_count: number
  quantity: string
  subtotal: string
  vat: string
  line_total: string
  document_total: string
  document_difference: string
  categories: SalesProductsGroupRow[]
  points_of_sale: SalesProductsGroupRow[]
}

export interface SalesProductsCompanySummary {
  company_id: string
  company_name: string
  subdomain: string
  currencies: SalesProductsCurrencySummary[]
}

export interface SalesProductsSummary {
  generated_at: string
  period: { from: string; to: string }
  criteria: {
    ov_statuses: number[]
    amount_basis: string
    currency: string
    quantity: string
  }
  companies: SalesProductsCompanySummary[]
  totals: SalesProductsCurrencySummary[]
}

export interface SalesProductsMovement {
  id: string
  company_id: string
  company_name: string
  currency_code: string
  date: string
  document_id: string
  document_reference: string
  document_status: number
  party_name: string
  point_of_sale: string
  product_id: string | null
  product_key: string
  product_name: string
  sku: string
  category_key: string
  category: string
  category_path: string
  quantity: string
  unit_price: string
  subtotal: string
  vat: string
  unit_price_with_vat: string
  line_total: string
}

export interface SalesProductsDetail {
  company: { id: string; name: string }
  group_type: 'CATEGORY' | 'PRODUCT' | 'POINT_OF_SALE'
  group_key: string
  currency_code: string
  page: number
  page_size: number
  total_rows: number
  items: SalesProductsMovement[]
}
