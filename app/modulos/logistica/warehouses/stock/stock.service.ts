import type {
  WarehouseStockItem,
  ProductStockItem,
  StockMovement,
  CreateStockMovementInput,
  TransferStockInput
} from '~/modulos/logistica/warehouses/stock/stock.types'

export const useStockService = () => {
  const getStock = (warehouseId: string) =>
    $fetch<WarehouseStockItem[]>(
      `/api/logistica/warehouse/stock/${warehouseId}`
    )

  const getStockByProduct = (productId: string) =>
    $fetch<ProductStockItem[]>(
      `/api/logistica/warehouse/stock/product/${productId}`
    )

  const getMovements = (warehouseId: string) =>
    $fetch<StockMovement[]>(
      `/api/logistica/warehouse/stock/${warehouseId}/movements`
    )

  const createMovement = (body: CreateStockMovementInput) =>
    $fetch<StockMovement>('/api/logistica/warehouse/stock/movement', {
      method: 'POST',
      body
    })

  const transferStock = (body: TransferStockInput) =>
    $fetch<{ success: boolean }>('/api/logistica/warehouse/stock/transfer', {
      method: 'POST',
      body
    })

  const removeStock = (warehouseId: string, productId: string) =>
    $fetch<{ success: boolean }>(
      `/api/logistica/warehouse/stock/${warehouseId}/${productId}`,
      {
        method: 'DELETE'
      }
    )

  return {
    getStock,
    getStockByProduct,
    getMovements,
    createMovement,
    transferStock,
    removeStock
  }
}
