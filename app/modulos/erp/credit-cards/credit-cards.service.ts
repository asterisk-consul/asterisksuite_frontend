export const useCreditCardsService = () => {
  const base = '/api/backend/credit-cards'
  return {
    findAll: (type?: 'COMPANY' | 'CUSTOMER') => $fetch<any[]>(base, { query: type ? { type } : undefined }),
    create: (body: any) => $fetch(base, { method: 'POST', body }),
    update: (id: string, body: any) => $fetch(`${base}/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => $fetch(`${base}/${id}`, { method: 'DELETE' }),
    transactions: (query?: Record<string, string>) => $fetch<any[]>(`${base}/transactions/list`, { query }),
    settle: (id: string, body: any) => $fetch(`${base}/transactions/${id}/settle`, { method: 'POST', body }),
    installments: (query?: Record<string, string>) => $fetch<any[]>(`${base}/installments/list`, { query }),
    payInstallment: (id: string, body: any) => $fetch(`${base}/installments/${id}/pay`, { method: 'POST', body }),
    dashboard: (days = 7) => $fetch<any>(`${base}/dashboard/summary`, { query: { days } }),
    report: (from?: string, to?: string) => $fetch<any>(`${base}/reports/summary`, { query: { from, to } }),
  }
}
