export interface SalesFlowSettings {
  accounting_basis: 'INVOICE' | 'ORDER' | 'ORDER_THEN_INVOICE'
  payment_document_basis: 'INVOICE' | 'ORDER' | 'BOTH'
  require_payment_for_delivery: boolean
  delivery_payment_percentage: number
  require_invoice_for_delivery: boolean
  auto_create_delivery_note: boolean
  allow_partial_delivery: boolean
  reserve_stock_on_order_confirmation: boolean
  allow_partial_stock_reservation: boolean
  allow_backorder_without_stock: boolean
  prompt_order_assignee_on_confirmation: boolean
  require_order_assignee_on_confirmation: boolean
  default_order_assignee_id: string | null
  recalculated_delivery_orders?: number
}

const baseUrl = '/api/backend/sales-flow'

export const useSalesFlowService = () => ({
  getSettings: () => $fetch<SalesFlowSettings>(`${baseUrl}/settings`),
  updateSettings: (body: Partial<SalesFlowSettings>) => $fetch<SalesFlowSettings>(`${baseUrl}/settings`, { method: 'PATCH', body }),
  findPrintTemplates: (category?: string) => $fetch<any[]>(`${baseUrl}/print-templates`, { query: category ? { category } : undefined }),
  savePrintTemplate: (id: string | null, body: Record<string, unknown>) =>
    $fetch<void>(id ? `${baseUrl}/print-templates/${id}` : `${baseUrl}/print-templates`, {
      method: id ? 'PATCH' : 'POST', body,
    }),
  removePrintTemplate: (id: string) => $fetch<void>(`${baseUrl}/print-templates/${id}`, { method: 'DELETE' }),
})
