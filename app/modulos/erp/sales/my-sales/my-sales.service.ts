import type { MySalesSummary, MySalesOrder, PendingClient, ClientSales, SalesAnalysis } from './my-sales.types'

export const useMySalesService = () => {
  const urlBase = '/api/sales/my-sales'

  const getSummary = (period?: string) =>
    $fetch<MySalesSummary>(`${urlBase}/summary`, { query: period ? { period } : {} })

  const getOrders = (period?: string, page?: number, pageSize?: number) =>
    $fetch<MySalesOrder[]>(`${urlBase}/orders`, {
      query: { ...(period ? { period } : {}), ...(page ? { page } : {}), ...(pageSize ? { pageSize } : {}) }
    })

  const getPending = () =>
    $fetch<PendingClient[]>(`${urlBase}/pending`)

  const getByClient = (period?: string) =>
    $fetch<ClientSales[]>(`${urlBase}/by-client`, { query: period ? { period } : {} })

  const getAnalysis = () =>
    $fetch<SalesAnalysis>(`${urlBase}/analysis`)

  return { getSummary, getOrders, getPending, getByClient, getAnalysis }
}
