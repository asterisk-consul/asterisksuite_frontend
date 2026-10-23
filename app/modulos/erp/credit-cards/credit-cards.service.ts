export const useCreditCardsService = () => {
  const base = '/api/backend/credit-cards'
  return {
    findAll: (type?: 'COMPANY' | 'CUSTOMER') => $fetch<any[]>(base, { query: type ? { type } : undefined }),
    create: (body: any) => $fetch(base, { method: 'POST', body }),
    update: (id: string, body: any) => $fetch(`${base}/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => $fetch(`${base}/${id}`, { method: 'DELETE' }),
    transactions: (query?: Record<string, string>) => $fetch<any[]>(`${base}/transactions/list`, { query }),
    settle: (id: string, body: any) => $fetch(`${base}/transactions/${id}/settle`, { method: 'POST', body }),
    settleBatch: (body: any) => $fetch(`${base}/settlements/batch`, { method: 'POST', body }),
    settlements: (page = '1') => $fetch<{ items: any[]; total: number; page: number; page_size: number }>(`${base}/settlements/list`, { query: { page } }),
    pendingCollections: (page = '1') => $fetch<{ items: any[]; total: number; page: number; page_size: number }>(`${base}/settlements/pending`, { query: { page } }),
    installments: (query?: Record<string, string>) => $fetch<any[]>(`${base}/installments/list`, { query }),
    summaries: (query?: Record<string, string>) => $fetch<{ items: any[]; total: number; page: number; page_size: number }>(`${base}/summaries/list`, { query }),
    generateSummaries: () => $fetch<{ processed: number; summary_items_created: number; has_more: boolean; unconfigured_transactions: number }>(`${base}/summaries/generate`, { method: 'POST' }),
    paySummary: (id: string, body: any) => $fetch(`${base}/summaries/${id}/pay`, { method: 'POST', body }),
    reverseSummaryPayment: (id: string) => $fetch(`${base}/summaries/${id}/reverse-payment`, { method: 'POST' }),
    dashboard: (days = 7) => $fetch<any>(`${base}/dashboard/summary`, { query: { days } }),
    report: (from?: string, to?: string) => $fetch<any>(`${base}/reports/summary`, { query: { from, to } }),
  }
}
