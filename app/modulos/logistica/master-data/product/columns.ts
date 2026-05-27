import type {
  Product,
  ProductType,
  ProductCostSource
} from '~/modulos/logistica/master-data/product/types/product.types'

import type { TableColumn } from '@nuxt/ui'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Product

type BadgeColor =
  | 'error'
  | 'primary'
  | 'warning'
  | 'secondary'
  | 'success'
  | 'info'
  | 'neutral'

type BadgeItem = {
  label: string
  color: BadgeColor
}

const productTypeConfig: Record<
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

  FINISHED_PRODUCT: {
    label: 'Producto Final',
    color: 'success'
  },

  SERVICE: {
    label: 'Servicio',
    color: 'secondary'
  },

  CONSUMABLE: {
    label: 'Consumible',
    color: 'primary'
  }
}

const costSourceConfig: Record<
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

export const productColumns = (actions: {
  onEdit?: (row: Row) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR'
  })

  return [
    useIdColumn<Row>(actions.onEdit),

    ...build([
      /* ========================
         PRODUCTO
      ======================== */

      {
        key: 'name',

        label: 'Producto',

        sortable: true
      },

      /* ========================
         SKU
      ======================== */

      {
        key: 'sku',

        label: 'SKU',

        sortable: true,

        cell: ({ row }) => row.original.sku ?? '—'
      },

      /* ========================
         TIPO
      ======================== */

      {
        key: 'product_type',

        label: 'Tipo',

        sortable: true,

        badge: {
          resolve: (row) => {
            const config = productTypeConfig[row.product_type]

            return {
              label: config?.label ?? row.product_type,

              color: config?.color ?? 'neutral'
            }
          }
        },

        meta: {
          filter: {
            type: 'select',

            operators: ['equals'],

            options: Object.entries(productTypeConfig).map(
              ([value, config]) => ({
                label: config.label,

                value
              })
            )
          }
        }
      },

      /* ========================
         ORIGEN COSTO
      ======================== */

      {
        key: 'cost_source',

        label: 'Origen Costo',

        sortable: true,

        badge: {
          resolve: (row) => {
            const config = costSourceConfig[row.cost_source]

            return {
              label: config?.label ?? row.cost_source,

              color: config?.color ?? 'neutral'
            }
          }
        }
      },

      /* ========================
         COSTO
      ======================== */

      {
        key: 'current_cost',

        label: 'Costo',

        sortable: true,

        cell: ({ row }) => {
          const value = row.original.current_cost

          if (!value) {
            return '—'
          }

          return new Intl.NumberFormat('es-AR', {
            style: 'currency',

            currency: 'ARS',

            maximumFractionDigits: 0
          }).format(Number(value))
        }
      },

      /* ========================
         FLAGS
      ======================== */

      {
        id: 'flags',

        label: 'Características',

        multiBadge: {
          resolve: (row) => {
            const badges: BadgeItem[] = []

            if (row.active) {
              badges.push({
                label: 'Activo',
                color: 'success'
              })
            }

            if (row.manages_stock) {
              badges.push({
                label: 'Stock',
                color: 'info'
              })
            }

            if (row.is_composed) {
              badges.push({
                label: 'Compuesto',
                color: 'warning'
              })
            }

            if (row.has_engineering) {
              badges.push({
                label: 'Ingeniería',
                color: 'primary'
              })
            }

            if (row.requires_refrigeration) {
              badges.push({
                label: 'Frío',
                color: 'secondary'
              })
            }

            return badges
          }
        }
      },

      /* ========================
         RECÁLCULO
      ======================== */

      {
        key: 'needs_cost_recalculation',

        label: 'Recálculo',

        badge: {
          resolve: (row) => ({
            label: row.needs_cost_recalculation ? 'Pendiente' : 'OK',

            color: row.needs_cost_recalculation ? 'warning' : 'success'
          })
        }
      },

      /* ========================
         FECHAS
      ======================== */

      {
        key: 'created_at',

        label: 'Creado',

        sortable: true,

        date: true
      },

      {
        key: 'updated_at',

        label: 'Actualizado',

        sortable: true,

        date: true
      }
    ])
  ]
}
