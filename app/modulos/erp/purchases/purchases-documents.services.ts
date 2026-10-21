import type { PurchasesDocument } from '../purchases/types/purchases-documents'

import type { PaginatedResponse, ServerListParams } from '~/types/pagination'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'

export type PurchasesListParams = {
  documentTypeId?: string
  status?: number
  category?: string
  categories?: string
  excludeCancelled?: boolean
  direction?: number
} & Partial<ServerListParams>

export const DocumentsPurchasesService = {
  async getAll(params?: PurchasesListParams): Promise<Document[]> {
    return $fetch('/api/backend/documents/purchases', {
      query: params
    })
  },

  async getPage(params: PurchasesListParams & ServerListParams): Promise<PaginatedResponse<Document>> {
    // La tabla inicia su carga también durante SSR. Reenviar cookies es necesario
    // para que el proxy backend reciba la sesión en la primera carga directa.
    return useRequestFetch()('/api/backend/documents/purchases', { query: params })
  },

  async getOne(id: string): Promise<Document> {
    return $fetch(`/api/backend/documents/purchases/${id}`)
  },

  async create(dto: any): Promise<Document> {
    return $fetch('/api/backend/documents/purchases', {
      method: 'POST' as any,
      body: dto
    })
  },

  async update(id: string, dto: any): Promise<Document> {
    return $fetch(`/api/backend/documents/purchases/${id}`, {
      method: 'PATCH' as any,
      body: dto
    })
  },
  async confirm(id: string, options?: { updateProductPrices?: boolean }): Promise<Document> {
    return $fetch(`/api/backend/documents/purchases/${id}/confirm`, {
      method: 'PATCH' as any,
      query: options
    })
  },

  async cancel(id: string): Promise<Document> {
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
