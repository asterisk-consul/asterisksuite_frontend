// types/logistica/warehouse/stock.ts

// ===============================
// Stock actual por producto
// ===============================

export interface WarehouseStockItem {
  id: string
  warehouse_id: string
  product_id: string
  quantity: string
  reserved_quantity: string
  products: {
    id: string
    name: string
    sku?: string | null
    unit_id?: string | null
  }
}

// ===============================
// Stock de producto por depósitos
// ===============================

export interface ProductStockItem {
  id: string
  warehouse_id: string
  product_id: string
  quantity: string
  reserved_quantity: string
  warehouses: {
    id: string
    name: string
    code?: string | null
    units?: {
      id: string
      name: string
      symbol: string
    } | null
  }
}

// ===============================
// Movimientos
// ===============================

export interface StockMovement {
  id: string
  warehouse_id: string
  product_id: string

  movement_type: string
  direction: 'IN' | 'OUT'

  quantity: string

  reference_type?: string | null
  reference_id?: string | null

  notes?: string | null
  created_by?: string | null
  created_by_name?: string | null

  balance_before?: number | null

  linked_warehouse_id?: string | null
  linked_warehouse_name?: string | null

  created_at: string
}

// ===============================
// Crear movimiento
// ===============================

export interface CreateStockMovementInput {
  warehouse_id: string
  product_id: string
  movement_type: string
  direction: 'IN' | 'OUT'
  quantity: string
  reference_type?: string
  reference_id?: string
  notes?: string
  created_by?: string
}

// ===============================
// Transferencia de stock
// ===============================

export interface TransferStockInput {
  product_id: string
  from_warehouse_id: string
  to_warehouse_id: string
  quantity: string
}
