export interface WarehouseProductionSummary {
  total_fabrications: number
  total_quantity: number
  recent_fabrications: number
  recent_quantity: number
  last_fabrication_at: string | null
}

export interface WarehouseProductionRecord {
  id: string
  product?: { name?: string | null; sku?: string | null } | null
  warehouse?: { name?: string | null } | null
  quantity: number
  created_at: string
}

export interface WarehouseProductionRequest {
  productId: string
  variantId?: string
  quantity: number
  materialWarehouseId: string
  outputWarehouseId: string
}

export interface WarehouseProductionMaterial {
  product_id: string
  name: string
  sku: string | null
  quantity: number
  available: number
  sufficient: boolean
  missing: number
}

export interface WarehouseProductionPreview {
  can_produce: boolean
  materials: WarehouseProductionMaterial[]
}

const urlBase = '/api/backend/warehouse/stock/production'

function toPayload(request: WarehouseProductionRequest) {
  return {
    product_id: request.productId,
    variant_id: request.variantId || undefined,
    quantity: request.quantity,
    material_warehouse_id: request.materialWarehouseId,
    output_warehouse_id: request.outputWarehouseId
  }
}

export const useWarehouseProductionService = () => {
  const requestFetch = (import.meta.server ? useRequestFetch() : $fetch) as typeof $fetch

  return {
    summary: () => requestFetch<WarehouseProductionSummary>(`${urlBase}/summary`),
    history: (limit = 50) =>
      requestFetch<WarehouseProductionRecord[]>(`${urlBase}/history`, { query: { limit } }),
    preview: (request: WarehouseProductionRequest) =>
      $fetch<WarehouseProductionPreview>(`${urlBase}/preview`, {
        method: 'POST',
        body: toPayload(request)
      }),
    execute: (request: WarehouseProductionRequest) =>
      $fetch<unknown>(`${urlBase}/execute`, {
        method: 'POST',
        body: toPayload(request)
      })
  }
}
