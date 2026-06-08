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
    label: 'Tarifa',
    value: 'RATES'
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

export type BadgeColor = 'error' | 'primary' | 'warning' | 'secondary' | 'success' | 'info' | 'neutral'

export type BadgeItem = {
  label: string
  color: BadgeColor
}

export const productTypeConfig: Record<
  ProductType,
  {
    label: string
    color: BadgeColor
  }
> = {
  RAW_MATERIAL: {
    label: 'Materia Prima',
    color: 'warning'
  },

  SEMI_FINISHED: {
    label: 'Producto Semielaborado',
    color: 'info'
  },

  FINISHED_PRODUCT: {
    label: 'Producto Final',
    color: 'success'
  },

  SERVICE: {
    label: 'Servicio',
    color: 'secondary'
  },

  RATES: {
    label: 'Tarifas',
    color: 'primary'
  }
}

export const costSourceConfig: Record<
  ProductCostSource,
  {
    label: string
    color: BadgeColor
  }
> = {
  MANUAL: {
    label: 'Manual',
    color: 'neutral'
  },

  PURCHASE: {
    label: 'Compra',
    color: 'primary'
  },

  ENGINEERING: {
    label: 'Ingeniería',
    color: 'success'
  },

  BOM: {
    label: 'BOM',
    color: 'warning'
  },
  RATE: {
    label: 'Tarifa',
    color: 'secondary'
  }
}
