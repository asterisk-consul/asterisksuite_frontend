import type {
  WarehouseStockItem,
  ProductStockItem,
  StockMovement,
  CreateStockMovementInput,
  TransferStockInput
} from '~/modulos/logistica/warehouses/stock/stock.types'

export const useStockService = () => {
  const replenishmentPoliciesBase = '/api/backend/warehouse/replenishment/policies'
  const reservationsBase = '/api/backend/warehouse/stock-reservations'
  const getStock = (warehouseId: string) =>
    $fetch<WarehouseStockItem[]>(
      `/api/backend/warehouse/stock/${warehouseId}`
    )

  const getStockByProduct = (productId: string) =>
    $fetch<ProductStockItem[]>(
      `/api/backend/warehouse/stock/product/${productId}`
    )

  const getMovements = (warehouseId: string) =>
    $fetch<StockMovement[]>(
      `/api/backend/warehouse/stock/${warehouseId}/movements`
    )

  const createMovement = (body: CreateStockMovementInput) =>
    $fetch<StockMovement>('/api/backend/warehouse/stock/movement', {
      method: 'POST',
      body
    })

  const transferStock = (body: TransferStockInput) =>
    $fetch<{ success: boolean }>('/api/backend/warehouse/stock/transfer', {
      method: 'POST',
      body
    })

  const removeStock = (warehouseId: string, productId: string) =>
    $fetch<{ success: boolean }>(
      `/api/backend/warehouse/stock/${warehouseId}/${productId}`,
      {
        method: 'DELETE'
      }
    )

  const findReplenishmentPolicies = (productId: string) =>
    $fetch<any[]>(`${replenishmentPoliciesBase}/product/${productId}`)

  const saveReplenishmentPolicy = (id: string | null, body: Record<string, unknown>) =>
    $fetch<any>(id ? `${replenishmentPoliciesBase}/${id}` : replenishmentPoliciesBase, {
      method: id ? 'PATCH' : 'POST',
      body,
    })

  const removeReplenishmentPolicy = (id: string) =>
    $fetch<void>(`${replenishmentPoliciesBase}/${id}`, { method: 'DELETE' })

  const findReservations = (warehouseId: string) =>
    $fetch<any[]>(reservationsBase, { query: { warehouse_id: warehouseId } })

  const createReservation = (body: Record<string, unknown>) =>
    $fetch<any>(reservationsBase, { method: 'POST', body })

  const releaseReservation = (id: string) =>
    $fetch<any>(`${reservationsBase}/${id}/release`, { method: 'PATCH' })

  const getReplenishmentReport = (query?: Record<string, unknown>) =>
    $fetch<{ data: any[]; meta: any }>('/api/backend/warehouse/replenishment/report', { query })

  const getAvailabilityReport = (query?: Record<string, unknown>) =>
    $fetch<{ data: any[]; meta: any }>('/api/backend/warehouse/stock/reports/availability', { query })

  return {
    getStock,
    getStockByProduct,
    getMovements,
    createMovement,
    transferStock,
    removeStock,
    findReplenishmentPolicies,
    saveReplenishmentPolicy,
    removeReplenishmentPolicy,
    findReservations,
    createReservation,
    releaseReservation,
    getReplenishmentReport,
    getAvailabilityReport
  }
}
