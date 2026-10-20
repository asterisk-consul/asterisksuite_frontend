export type CurrencyTotals = Record<string, number>
export type ConsolidatedReportView = 'consolidated' | 'customers' | 'suppliers' | 'hr' | 'treasury' | 'documents' | 'inventory'
export interface DetailAmountRow { label: string; currency_code: string; amount: number; count: number; balance?: number }
export interface DocumentSummaryRow { direction: 'SALE' | 'PURCHASE'; category: string; status: number; currency_code: string; amount: number; count: number }
export interface PartySummaryRow { role: string; total: number; active: number; with_balance: number; currency_code: string; balance: number }
export interface PersonSummaryRow { name: string; kind: 'EMPLOYEE' | 'PARTNER'; active: boolean; detail: string; currency_code: string; configured_amount: number; movements_amount: number; movements_count: number; pending_amount: number }
export interface FinancialAccountRow { name: string; institution?: string; status: string; currency_code: string; current_balance: number; period_change: number; opening_amount: number; movement_count: number }
export interface InventoryOrderRow { order_number: number; order_date: string; customer: string; product: string; quantity: number; status: string; confirmation_at: string | null; user: string }
export interface StockMovementSummaryRow { product: string; movement_type: string; direction: string; quantity: number; count: number }
export interface ConsolidatedReportCompany {
  company_id: string
  company_name: string
  subdomain: string
  role: string
  sales: CurrencyTotals
  purchases: CurrencyTotals
  collections: CurrencyTotals
  payments: CurrencyTotals
  receivables: CurrencyTotals
  payables: CurrencyTotals
  banks: CurrencyTotals
  cash: CurrencyTotals
  pending_checks: CurrencyTotals
  counts: { sales: number; purchases: number; collections: number; payments: number; pending_checks: number }
  details: {
    narratives: string[]
    party_summary: PartySummaryRow[]
    collections_by_party: DetailAmountRow[]
    payments_by_party: DetailAmountRow[]
    customer_balances: DetailAmountRow[]
    supplier_balances: DetailAmountRow[]
    documents: DocumentSummaryRow[]
    obligations: DetailAmountRow[]
    hr_vales: DetailAmountRow[]
    employees: PersonSummaryRow[]
    partners: PersonSummaryRow[]
    bank_accounts: FinancialAccountRow[]
    cash_boxes: FinancialAccountRow[]
    payment_statuses: DetailAmountRow[]
    checks: DetailAmountRow[]
    treasury_movements: DetailAmountRow[]
    transfers: DetailAmountRow[]
    treasury_variation: DetailAmountRow[]
    stock_movements: StockMovementSummaryRow[]
    inventory_orders: InventoryOrderRow[]
    alerts: string[]
  }
}
export interface ConsolidatedReportResponse {
  generated_at: string
  view: ConsolidatedReportView
  period: { from: string; to: string }
  currency_note: string
  companies: ConsolidatedReportCompany[]
  consolidated: Pick<ConsolidatedReportCompany, 'sales' | 'purchases' | 'collections' | 'payments' | 'receivables' | 'payables' | 'banks' | 'cash' | 'pending_checks' | 'counts'>
}
export interface ConsolidatedReportCompanyOption {
  id: string
  name: string
  subdomain: string
  role: 'OWNER' | 'ADMIN' | 'USER'
}
