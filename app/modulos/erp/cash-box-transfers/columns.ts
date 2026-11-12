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
  processing: { label: 'Procesando', color: 'info' },
  debit_applied: { label: 'Débito aplicado', color: 'warning' },
  failed: { label: 'Requiere reintento', color: 'error' },
  completed: { label: 'Completada', color: 'success' },
  reversing: { label: 'Anulación en curso', color: 'warning' },
  reversed: { label: 'Anulada', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'error' }
}

export const cashBoxTransferColumns = (actions: {
  onDetail?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
  onConfirm?: (row: Row) => void
  onCancel?: (row: Row) => void
  canReverse?: (row: Row) => boolean
  onReverse?: (row: Row) => void
  canDelete?: (row: Row) => boolean
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
        key: 'record_side',
        label: 'Dirección',
        cell: ({ row }) => row.original.record_side === 'destination' ? 'Recibida' : 'Enviada',
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Enviada', value: 'source' },
              { label: 'Recibida', value: 'destination' }
            ]
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
              label: row.status === 'reversing' && row.execution_error
                ? 'Requiere reintento de anulación'
                : (config?.label ?? row.status),
              color: ((row.status === 'reversing' && row.execution_error ? 'error' : config?.color) as any) ?? 'neutral'
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
          const buttons: Array<{ icon: string; color: string; onClick: () => void; label?: string }> = []

          if (status === 'pending') {
            buttons.push({ icon: 'i-lucide-check-circle', color: 'success', onClick: () => actions.onConfirm?.(row.original) })
            buttons.push({ icon: 'i-lucide-x-circle', color: 'warning', onClick: () => actions.onCancel?.(row.original) })
            if (actions.canDelete?.(row.original)) buttons.push({ icon: 'i-lucide-trash-2', color: 'error', label: 'Eliminar transferencia', onClick: () => actions.onDelete?.(row.original) })
          } else if (['processing', 'debit_applied', 'failed'].includes(status)) {
            buttons.push({ icon: 'i-lucide-refresh-cw', color: 'warning', onClick: () => actions.onConfirm?.(row.original) })
            buttons.push({ icon: 'i-lucide-eye', color: 'neutral', onClick: () => actions.onDetail?.(row.original) })
          } else if (status === 'completed') {
            if (row.original.record_side !== 'destination' && row.original.dest_company_id) {
              buttons.push({ icon: 'i-lucide-refresh-cw', color: 'warning', onClick: () => actions.onConfirm?.(row.original) })
            }
            if (row.original.record_side !== 'destination' && actions.canReverse?.(row.original)) {
              buttons.push({ icon: 'i-lucide-undo-2', color: 'error', label: 'Anular transferencia', onClick: () => actions.onReverse?.(row.original) })
            }
            buttons.push({ icon: 'i-lucide-eye', color: 'neutral', onClick: () => actions.onDetail?.(row.original) })
          } else if (status === 'reversing') {
            if (row.original.execution_error && row.original.record_side !== 'destination' && actions.canReverse?.(row.original)) {
              buttons.push({ icon: 'i-lucide-rotate-ccw', color: 'warning', label: 'Reintentar anulación', onClick: () => actions.onReverse?.(row.original) })
            }
            buttons.push({ icon: 'i-lucide-eye', color: 'neutral', onClick: () => actions.onDetail?.(row.original) })
          } else if (status === 'reversed') {
            if (row.original.record_side !== 'destination' && actions.canDelete?.(row.original)) {
              buttons.push({ icon: 'i-lucide-trash-2', color: 'error', label: 'Eliminar transferencia anulada', onClick: () => actions.onDelete?.(row.original) })
            }
            buttons.push({ icon: 'i-lucide-eye', color: 'neutral', onClick: () => actions.onDetail?.(row.original) })
          }

          return h('div', { class: 'flex gap-1' }, buttons.map((btn) =>
            h(UButton, { icon: btn.icon, size: 'xs', variant: 'ghost', color: btn.color as any, 'aria-label': btn.label, title: btn.label, onClick: btn.onClick })
          ))
        }
      }
    ])
  ]
}
