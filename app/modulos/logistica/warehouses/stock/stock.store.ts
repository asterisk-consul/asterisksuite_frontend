import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useStockService } from '~/modulos/logistica/warehouses/stock/stock.service'
import type {
  WarehouseStockItem,
  ProductStockItem,
  StockMovement,
  CreateStockMovementInput,
  TransferStockInput
} from '~/modulos/logistica/warehouses/stock/stock.types'

export const useStockStore = defineStore('stock', () => {
  const service = useStockService()

  const stock = ref<WarehouseStockItem[]>([])
  const productStock = ref<ProductStockItem[]>([])
  const movements = ref<StockMovement[]>([])
  const loading = ref(false)

  const currentWarehouseId = ref<string | null>(null)

  // =========================
  // LOAD STOCK
  // =========================
  const fetchStock = async (warehouseId: string) => {
    try {
      loading.value = true
      currentWarehouseId.value = warehouseId
      stock.value = await service.getStock(warehouseId)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD PRODUCT STOCK
  // =========================
  const fetchProductStock = async (productId: string) => {
    try {
      loading.value = true
      productStock.value = await service.getStockByProduct(productId)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD MOVEMENTS
  // =========================
  const fetchMovements = async (warehouseId: string) => {
    try {
      loading.value = true
      movements.value = await service.getMovements(warehouseId)
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CREATE MOVEMENT
  // =========================
  const createMovement = async (payload: CreateStockMovementInput) => {
    const movement = await service.createMovement(payload)

    // agregar al historial
    movements.value.unshift(movement)

    // actualizar stock local si coincide warehouse
    if (payload.warehouse_id === currentWarehouseId.value) {
      const item = stock.value.find((s) => s.product_id === payload.product_id)

      if (item) {
        const currentQty = parseFloat(item.quantity)
        const moveQty = parseFloat(payload.quantity)

        item.quantity =
          payload.direction === 'IN'
            ? (currentQty + moveQty).toString()
            : (currentQty - moveQty).toString()
      }
    }

    // La vista de producto consume productStock. Recargarlo después del
    // movimiento permite mostrar inmediatamente el depósito recién agregado.
    await fetchProductStock(payload.product_id)

    return movement
  }

  // =========================
  // TRANSFER STOCK
  // =========================
  const transferStock = async (payload: TransferStockInput) => {
    const result = await service.transferStock(payload)

    // Recargar stock del producto
    if (productStock.value.length > 0) {
      await fetchProductStock(payload.product_id)
    }

    return result
  }

  // =========================
  // REMOVE STOCK
  // =========================
  const removeStock = async (warehouseId: string, productId: string) => {
    const result = await service.removeStock(warehouseId, productId)

    // Remover del stock local
    productStock.value = productStock.value.filter(
      (s) => s.warehouse_id !== warehouseId
    )

    return result
  }

  return {
    stock,
    productStock,
    movements,
    loading,
    currentWarehouseId,
    fetchStock,
    fetchProductStock,
    fetchMovements,
    createMovement,
    transferStock,
    removeStock
  }
})
