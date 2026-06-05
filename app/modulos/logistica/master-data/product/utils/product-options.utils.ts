import type {
  ProductType,
  CalculationType,
  ProductCostSource
} from '~/modulos/logistica/master-data/product/types/product.types'

export const productTypeOptions: {
  label: string
  value: ProductType
}[] = [
  {
    label: 'Materia prima',
    value: 'RAW_MATERIAL'
  },
  {
    label: 'Producto terminado',
    value: 'FINISHED_PRODUCT'
  },
  {
    label: 'Producto intermedio',
    value: 'SEMI_FINISHED'
  },
  {
    label: 'Servicio',
    value: 'SERVICE'
  },
  {
    label: 'Consumible',
    value: 'CONSUMABLE'
  }
]

export const calculationTypeOptions: {
  label: string
  value: CalculationType
}[] = [
  {
    label: 'Unidad',
    value: 'UNIT'
  },
  {
    label: 'Superficie',
    value: 'SURFASE'
  },
  {
    label: 'Volumen',
    value: 'VOLUME'
  },
  {
    label: 'Lineal',
    value: 'LINEAR'
  }
]

export const ProductCostSourceOptions: {
  label: string
  value: ProductCostSource
}[] = [
  {
    label: 'Manual',
    value: 'MANUAL'
  },
  {
    label: 'BOM',
    value: 'BOM'
  },
  {
    label: 'Ingeniería',
    value: 'ENGINEERING'
  },
  {
    label: 'Compra',
    value: 'PURCHASE'
  },
  {
    label: 'Tasa',
    value: 'RATE'
  }
]
