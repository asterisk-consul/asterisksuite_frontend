import type { PurchasesDocument } from '../purchases/types/purchases-documents'

export const DocumentsPurchasesService = {
  async getAll(params?: { documentTypeId?: string; status?: number }): Promise<PurchasesDocument[]> {
    return $fetch('/api/erp/documents/purchases', {
      query: params
    })
  },

  async getOne(id: string): Promise<PurchasesDocument> {
    return $fetch(`/api/erp/documents/purchases/${id}`)
  },

  async create(dto: any): Promise<PurchasesDocument> {
    return $fetch('/api/erp/documents/purchases', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<PurchasesDocument> {
    return $fetch(`/api/erp/documents/purchases/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string): Promise<PurchasesDocument> {
    return $fetch(`/api/erp/documents/purchases/${id}/confirm`, {
      method: 'PATCH' as any
    })
  },

  async cancel(id: string): Promise<PurchasesDocument> {
    return $fetch(`/api/erp/documents/purchases/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  async remove(id: string): Promise<void> {
    return $fetch(`/api/erp/documents/purchases/${id}`, {
      method: 'DELETE' as any
    })
  },

  async generateFromAllTrips(): Promise<{
    total_trips: number
    results: any[]
  }> {
    return $fetch('/api/erp/documents/purchases/generate', {
      method: 'POST' as any
    })
  }
}
