import type {
  ProductType,
  ProductCostSource
} from '~/modulos/logistica/master-data/product/types/product.types'

// =========================
// PRODUCT TYPE
// =========================

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  RAW_MATERIAL: 'Materia Prima',

  FINISHED_PRODUCT: 'Producto Terminado',

  SEMI_FINISHED: 'Producto Semielaborado',

  SERVICE: 'Servicio',

  CONSUMABLE: 'Consumible'
}

// =========================
// COST SOURCE
// =========================

export const PRODUCT_COST_SOURCE_LABELS: Record<ProductCostSource, string> = {
  MANUAL: 'Manual',

  PURCHASE: 'Compra',

  ENGINEERING: 'Ingeniería',

  BOM: 'Lista de Materiales',

  RATE: 'Tarifa'
}
