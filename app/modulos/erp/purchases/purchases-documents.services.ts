import type { PurchasesDocument } from '../purchases/types/purchases-documents'

import type { PaginatedResponse, ServerListParams } from '~/types/pagination'
import type { Document, InvoiceReferenceDocument } from '~/modulos/erp/facturas/types/factura.types'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export type PurchasesListParams = {
  documentTypeId?: string
  status?: number
  category?: string
  categories?: string
  excludeCancelled?: boolean
  excludeOpeningBalances?: boolean
  direction?: number
} & Partial<ServerListParams>

export const DocumentsPurchasesService = {
  async getAll(params?: PurchasesListParams): Promise<Document[]> {
    return apiFetch<Document[]>('/api/backend/documents/purchases', {
      query: params
    })
  },

  async getInvoiceReferences(params: { page: number; pageSize: number; search?: string }): Promise<PaginatedResponse<InvoiceReferenceDocument>> {
    return apiFetch<PaginatedResponse<InvoiceReferenceDocument>>('/api/backend/documents/purchases/reference-invoices', { query: params })
  },

  async getInvoiceReference(id: string): Promise<InvoiceReferenceDocument> {
    return apiFetch<InvoiceReferenceDocument>(`/api/backend/documents/purchases/reference-invoices/${id}`)
  },

  async getPage(params: PurchasesListParams & ServerListParams): Promise<PaginatedResponse<Document>> {
    // La tabla inicia su carga también durante SSR. Reenviar cookies es necesario
    // para que el proxy backend reciba la sesión en la primera carga directa.
    const requestFetch = useRequestFetch() as unknown as (
      request: string,
      options: { query: PurchasesListParams & ServerListParams }
    ) => Promise<PaginatedResponse<Document>>
    return requestFetch('/api/backend/documents/purchases', { query: params })
  },

  async getOne(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/purchases/${id}`)
  },

  async create(dto: any): Promise<Document> {
    return apiFetch<Document>('/api/backend/documents/purchases', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/purchases/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string, options?: { updateProductPrices?: boolean }): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/purchases/${id}/confirm`, {
      method: 'PATCH' as any,
      query: options
    })
  },

  async cancel(id: string): Promise<Document> {
    return apiFetch<Document>(`/api/backend/documents/purchases/${id}/cancel`, {
      method: 'PATCH' as any
    })
  },

  async remove(id: string): Promise<void> {
    return apiFetch<void>(`/api/backend/documents/purchases/${id}`, {
      method: 'DELETE'
    })
  },

  async generateFromAllTrips(): Promise<{
    total_trips: number
    results: any[]
  }> {
    return apiFetch<{ total_trips: number; results: any[] }>('/api/backend/documents/purchases/generate', {
      method: 'POST' as any
    })
  }
}
