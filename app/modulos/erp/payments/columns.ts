import { h } from 'vue'
import { UButton } from '#components'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Payment

const typeConfig: Record<string, { label: string; color?: string }> = {
  PAYMENT: { label: 'Pago', color: 'error' },
  COLLECTION: { label: 'Cobro', color: 'success' }
}

const statusConfig: Record<string, { label: string; color?: string }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  PAID: { label: 'Pagado', color: 'success' },
  REVERSED: { label: 'Rechazado', color: 'warning' },
  CANCELLED: { label: 'Anulado', color: 'error' }
}

const methodConfig: Record<string, { label: string; color?: string }> = {
  CASH: { label: 'Efectivo', color: 'neutral' },
  CHECK: { label: 'Cheque', color: 'warning' },
  BANK_TRANSFER: { label: 'Transferencia', color: 'primary' },
  CREDIT_CARD: { label: 'Tarjeta crédito', color: 'info' },
  DEBIT_CARD: { label: 'Tarjeta débito', color: 'secondary' },
  VIRTUAL_WALLET: { label: 'Billetera virtual', color: 'success' }
}

export const paymentColumns = (actions: {
  onDetail?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
  showCreator?: boolean
  onConfirm?: (row: Row) => void
  onMarkAsPaid?: (row: Row) => void
  onReject?: (row: Row) => void
  onReverse?: (row: Row) => void
  onDelete?: (row: Row) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  const cols = [
    useIdColumn<Row>(actions.onDetail),

    ...build([
      {
        key: 'number',
        label: 'N°',
        sortable: true
      },
      {
        key: 'date',
        label: 'Fecha',
        sortable: true,
        date: true
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = typeConfig[row.type]
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
            options: Object.entries(typeConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'payment_method',
        label: 'Método',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = methodConfig[row.payment_method]
            return {
              label: config?.label ?? row.payment_method,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(methodConfig).map(([value, config]) => ({
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
        badge: {
          resolve: (row) => {
            const config = statusConfig[row.status]
            return {
              label: config?.label ?? row.status,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        }
      },
      ...(actions.showCreator ? [{
        key: 'created_by',
        label: 'Creado por',
        cell: ({ row }: { row: { original: Row } }) => row.original.creator?.name ?? row.original.creator?.email ?? '—'
      }] : []),
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
          const status = row.original.status
          const buttons: Array<{ icon: string; color: string; onClick: () => void }> = []

          if (status === 'DRAFT') {
            buttons.push({ icon: 'i-lucide-check-circle', color: 'info', onClick: () => actions.onConfirm?.(row.original) })
            buttons.push({ icon: 'i-lucide-trash-2', color: 'error', onClick: () => actions.onDelete?.(row.original) })
          } else if (status === 'CONFIRMED') {
            buttons.push({ icon: 'i-lucide-check', color: 'success', onClick: () => actions.onMarkAsPaid?.(row.original) })
            buttons.push({ icon: 'i-lucide-x-circle', color: 'warning', onClick: () => actions.onReject?.(row.original) })
            buttons.push({ icon: 'i-lucide-undo-2', color: 'error', onClick: () => actions.onReverse?.(row.original) })
          } else if (status === 'PAID') {
            buttons.push({ icon: 'i-lucide-undo-2', color: 'error', onClick: () => actions.onReverse?.(row.original) })
          }

          return h('div', { class: 'flex gap-1' }, buttons.map((btn) =>
            h(UButton, { icon: btn.icon, size: 'xs', variant: 'ghost', color: btn.color as any, onClick: btn.onClick })
          ))
        }
      }
    ])
  ]

  return cols
}
