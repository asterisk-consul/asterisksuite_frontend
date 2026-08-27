export interface SummaryFilters {
  startDate?: string
  endDate?: string
}

export interface PointOfSaleReport {
  point_of_sale: string
  count: number
  total: number
  byDocumentType: { code: string; count: number }[]
}

export interface PointOfSaleReportResponse {
  grandTotal: number
  totalCount: number
  totalPV: number
  data: PointOfSaleReport[]
}
