import type { Document, InvoiceReferenceDocument } from '~/modulos/erp/facturas/types/factura.types'

import type { PaginatedResponse, ServerListParams } from '~/types/pagination'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export type SalesListParams = {
    documentTypeId?: string
    status?: number
    deliveryStatus?: 'PENDING' | 'ELIGIBLE' | 'DRAFT_CREATED'
    category?: string
    categories?: string
    direction?: number
    party_id?: string
    excludeCancelled?: boolean
    excludeOpeningBalances?: boolean
    seller_id?: string
} & Partial<ServerListParams>

export type SalespersonOption = {
  id: string
  first_name: string
  last_name: string
}

export const DocumentsSalesService = {
  async getAll(params?: SalesListParams): Promise<Document[]> {
    return apiFetch<Document[]>('/api/backend/documents/sales', {
      query: params
    })
  },

  async getInvoiceReferences(params: { page: number; pageSize: number; search?: string }): Promise<PaginatedResponse<InvoiceReferenceDocument>> {
    return apiFetch<PaginatedResponse<InvoiceReferenceDocument>>('/api/backend/documents/sales/reference-invoices', { query: params })
  },

  async getInvoiceReference(id: string): Promise<InvoiceReferenceDocument> {
    return apiFetch<InvoiceReferenceDocument>(`/api/backend/documents/sales/reference-invoices/${id}`)
  },

  async getPage(params: SalesListParams & ServerListParams): Promise<PaginatedResponse<Document>> {
    // La tabla inicia su carga también durante SSR. Reenviar cookies es necesario
    // para que el proxy backend reciba la sesión en la primera carga directa.
    const requestFetch = useRequestFetch() as unknown as (
      request: string,
      options: { query: SalesListParams & ServerListParams }
    ) => Promise<PaginatedResponse<Document>>
    return requestFetch('/api/backend/documents/sales', { query: params })
  },

  async getOne(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}`)
  },

  async getSalespeople(): Promise<SalespersonOption[]> {
    return apiFetch<SalespersonOption[]>('/api/backend/documents/sales/salespeople')
  },

  async createDispatch(id: string): Promise<any> {
    return apiFetch<any>(`/api/backend/documents/sales/${id}/create-dispatch`, { method: 'POST' })
  },

  async createRemitoFromDispatch(dispatchId: string): Promise<any> {
    return apiFetch<any>(`/api/backend/documents/sales/dispatch/${dispatchId}/create-remito`, { method: 'POST' })
  },

  async getStockAvailability(id: string): Promise<any> {
    return apiFetch<any>(`/api/backend/documents/sales/${id}/stock-availability`)
  },

  async create(dto: any): Promise<Document> {
    return apiFetch<Document>('/api/backend/documents/sales', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string, options?: { assigned_to?: string | null }): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/confirm`, {
      method: 'PATCH' as any,
      body: options ?? {}
    })
  },

  async cancel(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  async accept(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/accept`, {
      method: 'PATCH' as any
    })
  },

  async deliver(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/deliver`, {
      method: 'PATCH' as any
    })
  },

  async partialDeliver(id: string, items: { document_item_id: string; quantity: number }[]): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/partial-deliver`, {
      method: 'PATCH' as any,
      body: { items }
    })
  },

  async partialInvoice(id: string, items: { document_item_id: string; quantity: number }[]): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/partial-invoice`, {
      method: 'PATCH' as any,
      body: { items }
    })
  },

  async changeStatus(id: string, status: number): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/sales/${id}/status`, {
      method: 'PATCH' as any,
      body: { status }
    })
  },

  async remove(id: string): Promise<void> {
    return apiFetch<void>(`/api/backend/documents/sales/${id}`, { method: 'DELETE' })
  },

  async generateFromAllTrips(): Promise<{
    total_trips: number
    results: any[]
  }> {
    return apiFetch<{ total_trips: number; results: any[] }>('/api/backend/documents/sales/generate', {
      method: 'POST' as any
    })
  },

  async getCompletedTripsPending(): Promise<{
    id: string
    reference_number: string | null
    total_orders: number
    total_amount: number
  }[]> {
    return apiFetch<{
      id: string
      reference_number: string | null
      total_orders: number
      total_amount: number
    }[]>('/api/backend/documents/sales/completed-trips-pending')
  },

  async generateFromTrips(payload: {
    tripIds: string[]
    documentTypeId: string
  }): Promise<{ results: { tripId: string; created: number; skipped: number }[] }> {
    return apiFetch<{ results: { tripId: string; created: number; skipped: number }[] }>('/api/backend/documents/sales/generate-from-trips', {
      method: 'POST' as any,
      body: payload
    })
  },

  async generateFromTrip(tripId: string): Promise<{ created: number; skipped: number }> {
    return apiFetch<{ created: number; skipped: number }>(`/api/backend/documents/sales/generate-from-trip/${tripId}`, {
      method: 'POST' as any,
    })
  }
}
