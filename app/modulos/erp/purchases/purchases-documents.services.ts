import type { PurchasesDocument } from '../purchases/types/purchases-documents'

export const DocumentsPurchasesService = {
  async getAll(params?: { documentTypeId?: string; status?: number; category?: string; direction?: number }): Promise<PurchasesDocument[]> {
    return $fetch('/api/backend/documents/purchases', {
      query: params
    })
  },

  async getOne(id: string): Promise<PurchasesDocument> {
    return $fetch(`/api/backend/documents/purchases/${id}`)
  },

  async create(dto: any): Promise<PurchasesDocument> {
    return $fetch('/api/backend/documents/purchases', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<PurchasesDocument> {
    return $fetch(`/api/backend/documents/purchases/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string, options?: { updateProductPrices?: boolean }): Promise<PurchasesDocument> {
    return $fetch(`/api/backend/documents/purchases/${id}/confirm`, {
      method: 'PATCH' as any,
      query: options
    })
  },

  async cancel(id: string): Promise<PurchasesDocument> {
    return $fetch(`/api/backend/documents/purchases/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  async remove(id: string): Promise<void> {
    return $fetch(`/api/backend/documents/purchases/${id}`, {
      method: 'DELETE' as any
    })
  },

  async generateFromAllTrips(): Promise<{
    total_trips: number
    results: any[]
  }> {
    return $fetch('/api/backend/documents/purchases/generate', {
      method: 'POST' as any
    })
  }
}
