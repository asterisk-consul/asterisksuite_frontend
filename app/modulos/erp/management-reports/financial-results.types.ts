export type FinancialResultsMetric =
  | 'sales_confirmed'
  | 'purchase_invoices'
  | 'purchase_invoices_pending'
  | 'payments'
  | 'expenses'
  | 'other_outflows'
  | 'outflows'
  | 'collections'
  | 'pending_orders'
  | 'opening_balance_receivable'

export type FinancialResultsMetricKey = FinancialResultsMetric | 'sales_order_paid' | 'purchase_invoices_paid'
export type FinancialResultsMoneyMap = Record<string, string>
export type FinancialResultsCountMap = Record<string, number>

export interface FinancialResultsMetrics {
  sales_confirmed: FinancialResultsMoneyMap
  sales_order_paid: FinancialResultsMoneyMap
  purchase_invoices: FinancialResultsMoneyMap
  purchase_invoices_paid: FinancialResultsMoneyMap
  purchase_invoices_pending: FinancialResultsMoneyMap
  payments: FinancialResultsMoneyMap
  expenses: FinancialResultsMoneyMap
  other_outflows: FinancialResultsMoneyMap
  outflows: FinancialResultsMoneyMap
  collections: FinancialResultsMoneyMap
  pending_orders: FinancialResultsMoneyMap
  opening_balance_receivable: FinancialResultsMoneyMap
}

export interface FinancialResultsCounts {
  sales_confirmed: FinancialResultsCountMap
  orders_paid_full: FinancialResultsCountMap
  orders_paid_partial: FinancialResultsCountMap
  orders_unpaid: FinancialResultsCountMap
  purchase_invoices: FinancialResultsCountMap
  purchase_invoices_pending: FinancialResultsCountMap
  purchase_invoices_paid_full: FinancialResultsCountMap
  purchase_invoices_paid_partial: FinancialResultsCountMap
  purchase_invoices_unpaid: FinancialResultsCountMap
  payments: FinancialResultsCountMap
  expenses: FinancialResultsCountMap
  other_outflows: FinancialResultsCountMap
  outflows: FinancialResultsCountMap
  collections: FinancialResultsCountMap
  pending_orders: FinancialResultsCountMap
  opening_balance_receivable: FinancialResultsCountMap
}

export interface FinancialResultsCompany {
  company_id: string
  company_name: string
  subdomain: string
  metrics: FinancialResultsMetrics
  counts: FinancialResultsCounts
}

export interface FinancialResultsSummary {
  generated_at: string
  period: { from: string; to: string }
  currency_note: string
  criteria: Record<FinancialResultsMetric, string>
  companies: FinancialResultsCompany[]
  totals: { metrics: FinancialResultsMetrics; counts: FinancialResultsCounts }
}

export interface FinancialResultsCompositionRow {
  key: string
  account_id: string | null
  account_code: string | null
  account_name: string
  label: string
  metric_type: string | null
  currency_code: string
  amount: string
  document_count: number
}

export interface FinancialResultsDetailRow {
  id: string
  document_id: string
  document_category: string
  document_label: string
  document_reference: string
  document_date: string
  party_id: string | null
  party_name: string
  reference: string | null
  description: string | null
  status: number | string
  currency_code: string
  account_key: string
  account_id: string | null
  account_code: string | null
  account_name: string
  metric_type: string | null
  origin: string
  amount: string
  document_total_amount: string
  paid_amount: string | null
  pending_amount: string | null
  payment_state: 'UNPAID' | 'PARTIAL' | 'PAID' | null
  item_count: number
  expandable: boolean
}

export interface FinancialResultsDetail {
  generated_at: string
  period: { from: string; to: string }
  company: { id: string; name: string }
  metric: FinancialResultsMetric
  currency_code: string | null
  account_key: string | null
  page: number
  page_size: number
  composition: FinancialResultsCompositionRow[]
  items: FinancialResultsDetailRow[]
  total_rows: number
  total_documents: number
  total_amount: string
}

export interface FinancialResultsDocumentItems {
  document_id: string
  document_reference: string
  currency_code: string
  document_total_amount: string
  paid_amount: string
  pending_amount: string
  items: Array<{
    id: string
    product_name: string
    variant_name: string | null
    quantity: string
    account_id: string | null
    account_code: string | null
    account_name: string
    amount: string
    currency_code: string
    kind: 'ITEM' | 'DIFFERENCE'
  }>
}
