export type ObligationStatus = 'PLANNED' | 'REVIEW' | 'READY' | 'PAID' | 'CANCELLED' | 'OVERDUE'

export interface TreasuryObligation {
  id: string
  template_id?: string | null
  party_id: string
  category: string
  treatment: 'FISCAL_INVOICE' | 'DIRECT_EXPENSE'
  service_product_id?: string | null
  expense_account_id?: string | null
  net_amount?: number | null
  period_key: string
  description: string
  issue_date?: string | null
  due_date: string
  second_due_date?: string | null
  estimated_amount: number
  amount?: number | null
  second_due_amount?: number | null
  currency_code: string
  exchange_rate?: number | null
  reference?: string | null
  document_id?: string | null
  payment_id?: string | null
  status: ObligationStatus
  effective_status: ObligationStatus
  notification_days: number[]
  should_notify: boolean
  notification_reason: string | null
  notes?: string | null
  paid_at?: string | null
  party?: { id: string; name: string; tax_id?: string | null; type: string } | null
  template?: { id: string; name: string; active: boolean; variable_amount: boolean } | null
}

export interface ObligationTemplate {
  id: string
  name: string
  party_id: string
  category: string
  treatment: 'FISCAL_INVOICE' | 'DIRECT_EXPENSE'
  service_product_id?: string | null
  expense_account_id?: string | null
  frequency: string
  interval_months: number
  start_date: string
  end_date?: string | null
  occurrences?: number | null
  due_day: number
  estimated_amount: number
  net_amount?: number | null
  currency_code: string
  variable_amount: boolean
  notification_days: number[]
  active: boolean
  party?: { id: string; name: string } | null
  _count?: { obligations: number }
}

const base = '/api/backend/treasury/obligations'
export const useTreasuryObligationsService = () => ({
  findAll: (query?: Record<string, any>) => $fetch<TreasuryObligation[]>(base, { query }),
  summary: () => $fetch<{ pending_amount: number; pending_by_currency: Record<string, number>; overdue: number; due_soon: number; requires_review: number; notifications_today: number }>(`${base}/summary`),
  templates: () => $fetch<ObligationTemplate[]>(`${base}/templates`),
  create: (body: Record<string, any>) => $fetch<TreasuryObligation>(base, { method: 'POST', body }),
  update: (id: string, body: Record<string, any>) => $fetch<TreasuryObligation>(`${base}/${id}`, { method: 'PATCH', body }),
  confirm: (id: string) => $fetch<TreasuryObligation>(`${base}/${id}/confirm`, { method: 'POST' }),
  cancel: (id: string) => $fetch<TreasuryObligation>(`${base}/${id}/cancel`, { method: 'POST' }),
  markPaid: (id: string, paymentId: string) => $fetch<TreasuryObligation>(`${base}/${id}/paid`, { method: 'POST', body: { payment_id: paymentId } }),
  createTemplate: (body: Record<string, any>) => $fetch<ObligationTemplate>(`${base}/templates`, { method: 'POST', body }),
  toggleTemplate: (id: string, active: boolean) => $fetch(`${base}/templates/${id}/active`, { method: 'PATCH', body: { active } })
})
