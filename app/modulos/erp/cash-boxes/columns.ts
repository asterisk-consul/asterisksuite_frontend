import { h } from 'vue'
import { UButton } from '#components'
import type { CashBox } from '~/modulos/erp/cash-boxes/types/cash-boxes.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = CashBox

const boxTypeConfig: Record<string, { label: string; color?: string }> = {
  MAIN: { label: 'Principal', color: 'primary' },
  FIXED: { label: 'Fija', color: 'info' },
  REGISTER: { label: 'Caja registradora', color: 'secondary' }
}

export const cashBoxColumns = (actions: {
  onDetail?: (row: Row) => void
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
  onOpenSession?: (row: Row) => void
  onCloseSession?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<Row>(actions.onDetail),

    ...build([
      {
        key: 'name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = boxTypeConfig[row.type]
            return {
              label: config?.label ?? row.type,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(boxTypeConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => ({
            label: row.status === 'OPEN' ? 'Abierta' : 'Cerrada',
            color: row.status === 'OPEN' ? 'success' : 'neutral'
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Abierta', value: 'OPEN' },
              { label: 'Cerrada', value: 'CLOSED' }
            ]
          }
        }
      },
      {
        key: 'opening_balance',
        label: 'Saldo apertura',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.opening_balance
          if (value == null) return '—'
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code ?? 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
        }
      },
      {
        key: 'is_main',
        label: 'Principal',
        badge: {
          resolve: (row) => ({
            label: row.is_main ? 'Principal' : '—',
            color: row.is_main ? 'primary' : 'neutral'
          })
        }
      },
      {
        key: 'created_at',
        label: 'Creado',
        sortable: true,
        date: true
      },
      {
        id: 'actions',
        label: '',
        cell: ({ row }) => {
          const isOpen = row.original.status === 'OPEN'
          return h('div', { class: 'flex gap-1' }, [
            h(UButton, {
              icon: 'i-lucide-eye',
              size: 'xs',
              variant: 'ghost',
              color: 'neutral',
              onClick: () => actions.onDetail?.(row.original)
            }),
            h(UButton, {
              icon: 'i-lucide-pencil',
              size: 'xs',
              variant: 'ghost',
              color: 'neutral',
              onClick: () => actions.onEdit?.(row.original)
            }),
            isOpen
              ? h(UButton, {
                  icon: 'i-lucide-lock',
                  size: 'xs',
                  variant: 'ghost',
                  color: 'warning',
                  onClick: () => actions.onCloseSession?.(row.original)
                })
              : h(UButton, {
                  icon: 'i-lucide-lock-open',
                  size: 'xs',
                  variant: 'ghost',
                  color: 'success',
                  onClick: () => actions.onOpenSession?.(row.original)
                }),
            h(UButton, {
              icon: 'i-lucide-trash-2',
              size: 'xs',
              variant: 'ghost',
              color: 'error',
              onClick: () => actions.onDelete?.(row.original)
            })
          ])
        }
      }
    ])
  ]
}
