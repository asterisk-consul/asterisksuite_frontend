import type { CashBoxMovement } from '~/modulos/erp/cash-box-movements/types/cash-box-movements.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'

type Row = CashBoxMovement

export const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; side: 'in' | 'out' }> = {
  PAYMENT: { label: 'Pago', color: 'error', side: 'out' },
  COLLECTION: { label: 'Cobro', color: 'success', side: 'in' },
  ADVANCE: { label: 'Anticipo', color: 'info', side: 'in' },
  LOAN: { label: 'Préstamo', color: 'warning', side: 'out' },
  LOAN_PAYMENT: { label: 'Pago préstamo', color: 'secondary', side: 'out' },
  ADJUSTMENT: { label: 'Ajuste', color: 'neutral', side: 'in' },
  TRANSFER: { label: 'Transferencia', color: 'primary', side: 'in' },
  CHECK_ISSUED: { label: 'Cheque emitido', color: 'warning', side: 'out' },
  CHECK_RECEIVED: { label: 'Cheque recibido', color: 'info', side: 'in' },
  CHECK_BOUNCED: { label: 'Cheque rechazado', color: 'error', side: 'out' },
  DEBIT: { label: 'Débito', color: 'error', side: 'out' },
  CREDIT: { label: 'Crédito', color: 'success', side: 'in' },
}

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_CONFIG).map(([value, config]) => ({
  label: config.label,
  value
}))

export const cashBoxMovementColumns = (actions: {
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    ...build([
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
            const config = MOVEMENT_TYPE_CONFIG[row.type]
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
            options: MOVEMENT_TYPE_OPTIONS
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
          const config = MOVEMENT_TYPE_CONFIG[row.original.type]
          const isPositive = config?.side === 'in'
          const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
          return `${isPositive ? '+' : '-'} ${formatted}`
        }
      },
      {
        key: 'balance_after',
        label: 'Saldo',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.balance_after
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
      }
    ])
  ]
}
