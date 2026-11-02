export interface PurchaseSummaryItem {
  productId: string
  productCode: string
  productName: string
  productCategory: string
  totalPurchases: number
  totalTaxes: number
  totalExempt: number
  transactionCount: number
  invoiceCount: number
  creditNoteCount: number
  firstPurchaseDate: string | null
  lastPurchaseDate: string | null
  avgPurchaseValue: number
  /** @deprecated Kept while older report consumers migrate. */
  totalQuantity?: number
  /** @deprecated Kept while older report consumers migrate. */
  totalCost?: number
  /** @deprecated Kept while older report consumers migrate. */
  unitPrice?: number
  supplier?: string
}

export interface PurchaseSummaryBySupplier {
  supplier: string
  supplierCode: string
  totalCost: number
  products: PurchaseSummaryItem[]
}

export interface PurchaseSummaryResponse {
  globalTotal: number
  globalTaxes: number
  globalExempt: number
  globalPurchaseTotal: number
  globalTransactionCount: number
  grandTotal: number
  negTotal: number
  totalProducts: number
  products: PurchaseSummaryItem[]
  /** @deprecated Present only in the legacy report response. */
  bySupplier?: PurchaseSummaryBySupplier[]
}

export interface PurchaseMovement {
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
