import type { Document } from '~/modulos/erp/facturas/types/factura.types'

export const DocumentsSalesService = {
  async getAll(params?: {
    documentTypeId?: string
    status?: number
    category?: string
  }): Promise<Document[]> {
    return $fetch('/api/erp/documents/sales', {
      query: params
    })
  },

  async getOne(id: string): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}`)
  },

  async create(dto: any): Promise<Document> {
    return $fetch('/api/erp/documents/sales', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/confirm`, {
      method: 'PATCH' as any
    })
  },

  async cancel(id: string): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  async accept(id: string): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/accept`, {
      method: 'PATCH' as any
    })
  },

  async deliver(id: string): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/deliver`, {
      method: 'PATCH' as any
    })
  },

  async partialDeliver(id: string, items: { document_item_id: string; quantity: number }[]): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/partial-deliver`, {
      method: 'PATCH' as any,
      body: { items }
    })
  },

  async partialInvoice(id: string, items: { document_item_id: string; quantity: number }[]): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/partial-invoice`, {
      method: 'PATCH' as any,
      body: { items }
    })
  },

  async changeStatus(id: string, status: number): Promise<Document> {
    return $fetch(`/api/erp/documents/sales/${id}/status`, {
      method: 'PATCH' as any,
      body: { status }
    })
  },

  async remove(id: string): Promise<void> {
    return $fetch(`/api/erp/documents/sales/${id}`, { method: 'DELETE' as any })
  },

  async generateFromAllTrips(): Promise<{
    total_trips: number
    results: any[]
  }> {
    return $fetch('/api/erp/documents/sales/generate', {
      method: 'POST' as any
    })
  },

  async getCompletedTripsPending(): Promise<{
    id: string
    reference_number: string | null
    total_orders: number
    total_amount: number
  }[]> {
    return $fetch('/api/erp/documents/sales/completed-trips-pending')
  },

  async generateFromTrips(payload: {
    tripIds: string[]
    documentTypeId: string
  }): Promise<{ results: { tripId: string; created: number; skipped: number }[] }> {
    return $fetch('/api/erp/documents/sales/generate-from-trips', {
      method: 'POST' as any,
      body: payload
    })
  }
}
