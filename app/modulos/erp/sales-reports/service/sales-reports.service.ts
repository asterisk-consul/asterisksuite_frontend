import type { PointOfSaleDocumentsResponse, PointOfSaleReportResponse, SummaryFilters } from '../types/sales-reports.types'

const urlBase = '/api/backend/sales-reports'

export const useSalesReportsService = () => {
  const byPointOfSale = (filters?: SummaryFilters) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.documentTypeFilter) params.set('documentTypeFilter', filters.documentTypeFilter)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return $fetch<PointOfSaleReportResponse>(`${urlBase}/by-point-of-sale${qs}`)
  }

  const byPointOfSaleDocuments = (query: SummaryFilters & { pointOfSale: string; currencyCode: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams({ pointOfSale: query.pointOfSale, currencyCode: query.currencyCode })
    if (query.startDate) params.set('startDate', query.startDate)
    if (query.endDate) params.set('endDate', query.endDate)
    if (query.documentTypeFilter) params.set('documentTypeFilter', query.documentTypeFilter)
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('pageSize', String(query.pageSize))
    return $fetch<PointOfSaleDocumentsResponse>(`${urlBase}/by-point-of-sale/documents?${params.toString()}`)
  }

  return { byPointOfSale, byPointOfSaleDocuments }
}
