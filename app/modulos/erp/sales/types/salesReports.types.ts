export interface SalesSummaryItem {
  productId: string
  productCode: string
  productName: string
  productCategory: string
  totalSales: number
  totalTaxes: number
  totalExempt: number
  transactionCount: number
  invoiceCount: number
  creditNoteCount: number
  firstSalesDate: string | null
  lastSalesDate: string | null
  avgPurchaseValue: number
  /** @deprecated Kept while older product-summary consumers migrate. */
  totalQuantity?: number
  /** @deprecated Kept while older product-summary consumers migrate. */
  totalCost?: number
  /** @deprecated Kept while older product-summary consumers migrate. */
  unitPrice?: number
  supplier?: string
}

export interface SalesSummaryBySupplier {
  supplier: string
  supplierCode: string
  totalCost: number
  products: SalesSummaryItem[]
}

export interface SalesSummaryResponse {
  globalTotal: number
  globalTaxes: number
  globalExempt: number
  globalSalesTotal: number
  globalTransactionCount: number
  grandTotal: number
  negTotal: number
  totalProducts: number
  products: SalesSummaryItem[]
  /** @deprecated Present only in the legacy report response. */
  bySupplier?: SalesSummaryBySupplier[]
}

export interface SalesMovement {
  ref: string
  number: string
  date: string
  supplierName: string
  supplierCode: string
  productId: number | null
  productCode: string
  productName: string
  documentTypeCode: string
  documentTypeName: string
  quantity: number
  unitPrice: number
  itemSubtotal: number
  documentSubtotal: number
  documentTotal: number
  taxCode: string
  taxName: string
  taxAmount: number
  sequenceNumber: string
  transactionType: string
  adjustedValue: number
}

export interface SummaryFilters {
  startDate?: string
  endDate?: string
  supplierId?: string
}
