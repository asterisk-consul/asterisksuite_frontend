export type ReportBasis = 'SALES_ORDER' | 'QUOTE' | 'INVOICE' | 'COLLECTION'
export type ReportGroupBy = 'DAY' | 'MONTH' | 'PARTY' | 'SELLER' | 'CURRENCY'
export type PaymentState = 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'
export type ProgressState = 'ALL' | 'NONE' | 'PARTIAL' | 'COMPLETE'

export interface ManagementReportPaymentDestination {
  method: string
  amount: number | null
  bank_account: { bank_name: string; account_number?: string | null; alias?: string | null; name: string } | null
  cash_box: { name: string } | null
}

export interface ManagementReportRow {
  id: string
  date: string
  label: string
  party_id: string | null
  party_name: string
  status?: number
  status_label?: string
  seller_id?: string | null
  seller_name?: string
  currency_code: string
  amount: number
  converted_amount: number | null
  paid_amount: number
  pending_amount: number
  payment_state: PaymentState
  invoicing_state: ProgressState
  delivery_state: ProgressState
  /** Solo en filas de Cobros: medio con el que se registró el cobro. */
  payment_method?: string | null
  /** Solo en filas de Cobros: cuentas y cajas donde ingresó el dinero. */
  payment_destinations?: ManagementReportPaymentDestination[] | null
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
  grouped_by_currency?: Array<{ key: string; label: string; currency_code: string; total: number; paid: number; pending: number; count: number }>
  commercial_performance: null | {
    sellers: SellerPerformance[]
  }
  rows: ManagementReportRow[]
}

export interface SellerPerformance {
  seller_id: string | null
  name: string
  revenue: number
  paid: number
  quantity: number
  document_count: number
}

export type ReportTemplateColumn = 'date' | 'label' | 'party_name' | 'currency_code' | 'amount' | 'paid_amount' | 'pending_amount' | 'payment_state'
export type ReportVisualization = 'KPIS' | 'CHART' | 'TABLE'
export type ReportChartType = 'BAR' | 'LINE' | 'DONUT'
export type ReportCanvasComponentType = 'KPI' | 'BAR' | 'LINE' | 'DONUT' | 'TABLE'
export type ReportCanvasDimension = 'MONTH' | 'DAY' | 'PARTY' | 'SELLER' | 'CURRENCY' | 'PAYMENT_STATE'
export type ReportCanvasMetric = 'TOTAL' | 'PAID' | 'PENDING' | 'COUNT'
export interface ReportCanvasComponent {
  id: string
  type: ReportCanvasComponentType
  title: string
  dimension: ReportCanvasDimension
  metric: ReportCanvasMetric
  width: 4 | 6 | 8 | 12
}
export interface SavedManagementReportTemplate {
  id: string
  name: string
  source: 'SALES'
  columns: ReportTemplateColumn[]
  visualizations?: ReportVisualization[]
  chart_type?: ReportChartType
  components?: ReportCanvasComponent[]
  query: Record<string, unknown>
  shared: boolean
  created_at: string
  updated_at: string
  owner_id: string
  is_owner: boolean
}
