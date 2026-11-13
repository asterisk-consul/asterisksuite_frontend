export interface SummaryFilters {
  startDate?: string
  endDate?: string
  documentTypeFilter?: SalesReportDocumentType
}

export type SalesReportDocumentType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ORDER' | 'QUOTE' | 'REMITO'

export interface PointOfSaleReport {
  point_of_sale: string
  count: number
  total: number
  currency_code: string
  byDocumentType: { code: string; count: number; total: number }[]
}

export interface PointOfSaleReportResponse {
  totalDocuments: number
  totalPV: number
  totalsByCurrency: Array<{ currency_code: string; total: number }>
  data: PointOfSaleReport[]
}

export interface PointOfSaleDocumentItem {
  id: string
  product_name: string
  variant_name: string | null
  quantity: number
  total: number
}

export interface PointOfSaleDocument {
  id: string
  reference: string
  date: string
  status: number
  type_code: string
  type_name: string
  category: string
  party_name: string
  currency_code: string
  total: number
  total_quantity: number
  items: PointOfSaleDocumentItem[]
}

export interface PointOfSaleDocumentsResponse {
  point_of_sale: string
  currency_code: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
  documents: PointOfSaleDocument[]
}
