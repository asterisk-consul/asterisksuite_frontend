import { createTableBuilder } from '@/composables/table/createColumns'
import type { TableColumn } from '@nuxt/ui'
import type {
  Product,
  ProductType,
  ProductCostSource
} from '~/modulos/logistica/master-data/product/types/product.types'
import {
  PRODUCT_TYPE_LABELS,
  PRODUCT_COST_SOURCE_LABELS
} from '~/modulos/logistica/master-data/product/composable/product-labels'

export const bomColumns = (actions?: {
  onInlineSave?: (row: Product, field: any, value: any) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Product>[] => {
  const build = createTableBuilder<Product>({
    locale: 'es-AR',
    onInlineSave: actions?.onInlineSave,
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return build([
    /* ========================
       SKU
    ======================== */
    {
      key: 'sku',
      label: 'SKU',
      sortable: true
    },

    /* ========================
       NOMBRE
    ======================== */
    {
      key: 'name',
      label: 'Nombre',
      sortable: true
    },

    /* ========================
       TIPO DE PRODUCTO
    ======================== */
    {
      key: 'product_type',
      label: 'Tipo',
      sortable: true,
      enum: {
        options: Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
          value,
          label
        }))
      }
    },

    /* ========================
       COSTO ACTUAL
    ======================== */
    {
      key: 'current_cost',
      label: 'Costo Actual',
      sortable: true,
      cell: ({ row }) =>
        new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(row.original.current_cost ?? 0),
      meta: {
        filter: {
          type: 'number',
          operators: ['equals', 'gt', 'lt']
        }
      }
    },

    /* ========================
       FUENTE DE COSTO
    ======================== */
    {
      key: 'cost_source',
      label: 'Fuente de Costo',
      enum: {
        options: Object.entries(PRODUCT_COST_SOURCE_LABELS).map(([value, label]) => ({
          value,
          label
        }))
      }
    },

    /* ========================
       ÚLTIMO CÁLCULO
    ======================== */
    {
      key: 'last_cost_calculated_at',
      label: 'Último Cálculo',
      sortable: true,
      date: true
    },

    /* ========================
       ACTIVO
    ======================== */
    {
      key: 'active',
      label: 'Activo',
      badge: {
        resolve: (row) => ({
          label: row.active ? 'Activo' : 'Inactivo',
          color: row.active ? 'success' : 'neutral'
        })
      },
      meta: {
        filter: {
          type: 'boolean'
        }
      }
    }
  ])
}
