export interface ProductReportLine {
  id: string
  documentId: string
  documentDate: string
  documentNumber: string
  documentReference: string
  documentTypeCode: string
  documentTypeName: string
  documentCategory: string | null
  documentStatus: number
  partyName: string
  currencyCode: string
  quantity: number
  unitPrice: number
  netAmount: number
  taxAmount: number
  totalAmount: number
}

export interface ProductReportLinesPage {
  page: number
  pageSize: number
  total: number
  items: ProductReportLine[]
}

export interface ProductReportFilters {
  startDate?: string
  endDate?: string
  documentTypeFilter?: string
}
