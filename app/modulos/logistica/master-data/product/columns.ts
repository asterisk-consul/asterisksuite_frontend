import { h } from 'vue'
import { UButton } from '#components'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

import type { TableColumn } from '@nuxt/ui'

import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Product
import type { BadgeItem } from '~/modulos/logistica/master-data/product/utils/product-options.utils'

import {
  costSourceConfig,
  productTypeConfig
} from '~/modulos/logistica/master-data/product/utils/product-options.utils'

export const productColumns = (actions: {
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
  categoryOptions?: { label: string; value: string }[]
  tagOptions?: { label: string; value: string }[]
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
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

      {
        id: 'category_id',
        label: 'Categorías',
        accessorFn: (row) => row.product_categories?.map((item) => item.categories?.name).filter(Boolean).join(', ') || '—',
        meta: {
          filter: actions.categoryOptions
            ? { type: 'select', operators: ['equals'], options: actions.categoryOptions }
            : false
        }
      },

      {
        id: 'tag_id',
        label: 'Etiquetas',
        accessorFn: (row) => row.product_tags?.map((item) => item.tags?.name).filter(Boolean).join(', ') || '—',
        meta: {
          filter: actions.tagOptions
            ? { type: 'select', operators: ['equals'], options: actions.tagOptions }
            : false
        }
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

            options: Object.entries(productTypeConfig).map(([value, config]) => ({
              label: config.label,

              value
            }))
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
        },

        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(costSourceConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
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

        meta: {
          filter: { type: 'number', operators: ['equals', 'gt', 'lt'] }
        },

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

        meta: {
          filter: { type: 'boolean', operators: ['equals'] }
        },

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
      },

      {
        id: 'actions',
        label: '',
        cell: ({ row }) => h('div', { class: 'flex gap-1' }, [
          h(UButton, {
            icon: 'i-lucide-pencil',
            size: 'xs',
            variant: 'ghost',
            color: 'neutral',
            onClick: () => actions.onEdit?.(row.original)
          }),
          actions.onDelete
            ? h(UButton, {
                icon: 'i-lucide-trash-2',
                size: 'xs',
                variant: 'ghost',
                color: 'error',
                onClick: () => actions.onDelete?.(row.original)
              })
            : null
        ])
      }
    ])
  ]
}
