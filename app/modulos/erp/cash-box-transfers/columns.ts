import { h } from 'vue'
import { UButton } from '#components'
import type { CashBoxTransfer } from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = CashBoxTransfer

const transferTypeConfig: Record<string, { label: string; color?: string }> = {
  CASH_TO_CASH: { label: 'Caja → Caja', color: 'info' },
  CASH_TO_BANK: { label: 'Caja → Banco', color: 'primary' },
  BANK_TO_CASH: { label: 'Banco → Caja', color: 'success' },
  BANK_TO_BANK: { label: 'Banco → Banco', color: 'secondary' }
}

const statusConfig: Record<string, { label: string; color?: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  completed: { label: 'Completada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'error' }
}

export const cashBoxTransferColumns = (actions: {
  onDetail?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
  onConfirm?: (row: Row) => void
  onCancel?: (row: Row) => void
  onDelete?: (row: Row) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<Row>(actions.onDetail),

    ...build([
      {
        key: 'created_at',
        label: 'Fecha',
        sortable: true,
        date: true
      },
      {
        key: 'transfer_type',
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = transferTypeConfig[row.transfer_type]
            return {
              label: config?.label ?? row.transfer_type,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(transferTypeConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'amount',
        label: 'Monto',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.amount
          if (value == null) return '—'
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
        }
      },
      {
        key: 'description',
        label: 'Descripción',
        cell: ({ row }) => row.original.description ?? '—'
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = statusConfig[row.status]
            return {
              label: config?.label ?? row.status,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(statusConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'creator',
        label: 'Creado por',
        cell: ({ row }) => row.original.creator?.name ?? row.original.creator?.email ?? '—'
      },
      {
        id: 'actions',
        label: '',
        cell: ({ row }) => {
          const status = row.original.status
          const buttons: Array<{ icon: string; color: string; onClick: () => void }> = []

          if (status === 'pending') {
            buttons.push({ icon: 'i-lucide-check-circle', color: 'success', onClick: () => actions.onConfirm?.(row.original) })
            buttons.push({ icon: 'i-lucide-x-circle', color: 'warning', onClick: () => actions.onCancel?.(row.original) })
            buttons.push({ icon: 'i-lucide-trash-2', color: 'error', onClick: () => actions.onDelete?.(row.original) })
          } else if (status === 'completed') {
            buttons.push({ icon: 'i-lucide-eye', color: 'neutral', onClick: () => actions.onDetail?.(row.original) })
          }

          return h('div', { class: 'flex gap-1' }, buttons.map((btn) =>
            h(UButton, { icon: btn.icon, size: 'xs', variant: 'ghost', color: btn.color as any, onClick: btn.onClick })
          ))
        }
      }
    ])
  ]
}
