import type { PointOfSaleReportResponse, SummaryFilters } from '../types/sales-reports.types'

const urlBase = '/api/erp/sales-reports'

export const useSalesReportsService = () => {
  const byPointOfSale = (filters?: SummaryFilters) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return $fetch<PointOfSaleReportResponse>(`${urlBase}/by-point-of-sale${qs}`)
  }

  return { byPointOfSale }
}
