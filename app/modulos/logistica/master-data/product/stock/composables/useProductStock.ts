import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useStockStore } from '~/modulos/logistica/warehouses/stock/stock.store'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import type { TransferStockInput } from '~/modulos/logistica/warehouses/stock/stock.types'

export const useProductStock = (productId: string) => {
  const stockStore = useStockStore()
  const depositosStore = useDepositosStore()

  const { productStock, loading } = storeToRefs(stockStore)
  const { warehouses } = storeToRefs(depositosStore)

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await Promise.all([
      stockStore.fetchProductStock(productId),
      depositosStore.fetchAll()
    ])
  }

  // =========================
  // ADD STOCK
  // =========================

  const addStock = async (warehouseId: string, quantity: string) => {
    return stockStore.createMovement({
      warehouse_id: warehouseId,
      product_id: productId,
      movement_type: 'MANUAL',
      direction: 'IN',
      quantity
    })
  }

  // =========================
  // TRANSFER
  // =========================

  const transferStock = async (dto: Omit<TransferStockInput, 'product_id'>) => {
    return stockStore.transferStock({
      ...dto,
      product_id: productId
    })
  }

  // =========================
  // REMOVE
  // =========================

  const removeStock = async (warehouseId: string) => {
    return stockStore.removeStock(warehouseId, productId)
  }

  // =========================
  // COMPUTED
  // =========================

  const totalStock = computed(() =>
    productStock.value.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
  )

  const totalReserved = computed(() =>
    productStock.value.reduce((sum, item) => sum + parseFloat(item.reserved_quantity), 0)
  )

  const totalAvailable = computed(() => totalStock.value - totalReserved.value)

  const warehousesWithStock = computed(() =>
    productStock.value.map((item) => ({
      ...item,
      warehouse: warehouses.value.find((w) => w.id === item.warehouse_id)
    }))
  )

  // Depósitos donde NO tiene stock (para agregar)
  const availableWarehouses = computed(() => {
    const warehouseIdsWithStock = new Set(productStock.value.map((s) => s.warehouse_id))
    return warehouses.value.filter(
      (w) => w.active && !warehouseIdsWithStock.has(w.id)
    )
  })

  return {
    // state
    productStock,
    loading,
    warehouses,

    // computed
    totalStock,
    totalReserved,
    totalAvailable,
    warehousesWithStock,
    availableWarehouses,

    // actions
    init,
    addStock,
    transferStock,
    removeStock
  }
}
