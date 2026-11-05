export interface SalesFlowSettings {
  accounting_basis: 'INVOICE' | 'ORDER' | 'ORDER_THEN_INVOICE'
  payment_document_basis: 'INVOICE' | 'ORDER' | 'BOTH'
  require_payment_for_delivery: boolean
  delivery_payment_percentage: number
  require_invoice_for_delivery: boolean
  require_order_delivery_address: boolean
  warn_when_order_delivery_data_empty: boolean
  auto_create_delivery_note: boolean
  allow_partial_delivery: boolean
  reserve_stock_on_order_confirmation: boolean
  allow_partial_stock_reservation: boolean
  allow_backorder_without_stock: boolean
  prompt_order_assignee_on_confirmation: boolean
  require_order_assignee_on_confirmation: boolean
  default_order_assignee_id: string | null
  default_order_auditor_id: string | null
  partner_share_basis: 'ORDER' | 'INVOICED'
  recalculated_delivery_orders?: number
}

export interface SalesFlowCommissionAssignment {
  seller_type: 'EMPLOYEE' | 'PARTNER'
  seller_id: string
  participation_rate: number
  commission_rate: number
  commission_base: 'INVOICED' | 'PAID'
}

export interface SalesFlowCommissionSeller {
  id: string
  seller_type: 'EMPLOYEE' | 'PARTNER'
  name: string
  party_id: string | null
  default_commission_rate: number
  commission_base: 'INVOICED' | 'PAID'
}

const baseUrl = '/api/backend/sales-flow'

export const useSalesFlowService = () => ({
  getSettings: () => $fetch<SalesFlowSettings>(`${baseUrl}/settings`),
  updateSettings: (body: Partial<SalesFlowSettings>) => $fetch<SalesFlowSettings>(`${baseUrl}/settings`, { method: 'PATCH', body }),
  getCommissionSettings: () => $fetch<{
    assignments: SalesFlowCommissionAssignment[]
    sellers: SalesFlowCommissionSeller[]
  }>(`${baseUrl}/settings/commission-defaults`),
  updateCommissionSettings: (assignments: SalesFlowCommissionAssignment[]) => $fetch<{
    assignments: SalesFlowCommissionAssignment[]
    sellers: SalesFlowCommissionSeller[]
  }>(`${baseUrl}/settings/commission-defaults`, { method: 'PATCH', body: { assignments } }),
  updatePartnerShareBasis: (partner_share_basis: 'ORDER' | 'INVOICED') =>
    $fetch<SalesFlowSettings>(`${baseUrl}/settings/partner-share`, { method: 'PATCH', body: { partner_share_basis } }),
  findPrintTemplates: (category?: string) => $fetch<any[]>(`${baseUrl}/print-templates`, { query: category ? { category } : undefined }),
  savePrintTemplate: (id: string | null, body: Record<string, unknown>) =>
    $fetch<void>(id ? `${baseUrl}/print-templates/${id}` : `${baseUrl}/print-templates`, {
      method: id ? 'PATCH' : 'POST', body,
    }),
  removePrintTemplate: (id: string) => $fetch<void>(`${baseUrl}/print-templates/${id}`, { method: 'DELETE' }),
})
