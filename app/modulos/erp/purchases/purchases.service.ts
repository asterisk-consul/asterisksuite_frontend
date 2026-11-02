import type {
  PurchaseSummaryResponse,
  PurchaseMovement,
  SummaryFilters
} from '../purchases/types/purchases.types'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export const PurchasesService = {
  async getSummary(filters?: SummaryFilters): Promise<PurchaseSummaryResponse> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.supplierId) params.set('supplierId', filters.supplierId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return apiFetch<PurchaseSummaryResponse>(`/api/backend/purchases/summary${qs}`)
  },

  async getMovements(
    filters?: SummaryFilters & { productId?: string }
  ): Promise<PurchaseMovement[]> {
    const params = new URLSearchParams()

    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.supplierId) params.set('supplierId', filters.supplierId)

    // ðŸ”¥ CLAVE
    if (filters?.productId) params.set('productId', filters.productId)

    const qs = params.toString() ? `?${params.toString()}` : ''

    return apiFetch<PurchaseMovement[]>(`/api/backend/purchases/movements${qs}`)
  },

  async getProducts() {
    return apiFetch<any[]>('/api/backend/purchases/products')
  },

  async getProductById(id: number | string) {
    return apiFetch<any>(`/api/backend/purchases/products/${id}`)
  }
}
