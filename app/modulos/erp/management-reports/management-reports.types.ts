export type ReportBasis = 'SALES_ORDER' | 'INVOICE' | 'COLLECTION'
export type ReportGroupBy = 'DAY' | 'MONTH' | 'PARTY' | 'SELLER' | 'CURRENCY'
export type PaymentState = 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'
export type ProgressState = 'ALL' | 'NONE' | 'PARTIAL' | 'COMPLETE'

export interface ManagementReportRow {
  id: string
  date: string
  label: string
  party_id: string | null
  party_name: string
  currency_code: string
  amount: number
  converted_amount: number | null
  paid_amount: number
  pending_amount: number
  payment_state: PaymentState
  invoicing_state: ProgressState
  delivery_state: ProgressState
}

export interface ManagementReportMetadata {
  parties: Array<{ id: string; name: string; tax_id: string | null }>
  sellers: Array<{ id: string; first_name: string; last_name: string }>
  products: Array<{ id: string; name: string; sku: string | null }>
  points_of_sale: Array<{ id: string; name: string; point_of_sale: string }>
}

export interface ManagementReportResponse {
  basis: ReportBasis
  summary: {
    count: number
    by_currency: Record<string, { total: number; paid: number; pending: number; count: number }>
    converted_total: number
    converted_paid: number
    converted_pending: number
    missing_exchange_rate_count: number
  }
  grouped: Array<{ key: string; label: string; total: number; paid: number; pending: number; count: number }>
  commercial_performance: null | {
    products_by_quantity: ProductPerformance[]
    products_by_revenue: ProductPerformance[]
    sellers: SellerPerformance[]
  }
  rows: ManagementReportRow[]
}

export interface ProductPerformance {
  product_id: string
  name: string
  sku: string | null
  quantity: number
  revenue: number
  document_count: number
  missing_exchange_rate_count: number
}

export interface SellerPerformance {
  seller_id: string | null
  name: string
  revenue: number
  paid: number
  quantity: number
  document_count: number
}
