import type { BankAccountMovement } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'

type Row = BankAccountMovement

export const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; side: 'in' | 'out' }> = {
  DEPOSIT: { label: 'Depósito', color: 'success', side: 'in' },
  WITHDRAWAL: { label: 'Retiro', color: 'error', side: 'out' },
  TRANSFER: { label: 'Transferencia', color: 'info', side: 'in' },
  PAYMENT: { label: 'Pago', color: 'error', side: 'out' },
  COLLECTION: { label: 'Cobro', color: 'success', side: 'in' },
  ADJUSTMENT: { label: 'Ajuste', color: 'neutral', side: 'in' },
  CHECK_ISSUED: { label: 'Cheque emitido', color: 'warning', side: 'out' },
  CHECK_RECEIVED: { label: 'Cheque recibido', color: 'info', side: 'in' },
  FEE: { label: 'Comisión', color: 'error', side: 'out' },
  INTEREST: { label: 'Interés', color: 'success', side: 'in' },
  CREDIT: { label: 'Crédito', color: 'success', side: 'in' },
  DEBIT: { label: 'Débito', color: 'error', side: 'out' },
}

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_CONFIG).map(([value, config]) => ({
  label: config.label,
  value
}))

export const bankMovementColumns = (actions: {
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
          const numValue = Number(value)
          const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Math.abs(numValue))
          return `${numValue >= 0 ? '+' : '-'} ${formatted}`
        }
      },
      {
        key: 'balance_before',
        label: 'Saldo ant.',
        cell: ({ row }) => {
          const value = row.original.balance_before
          if (value == null) return '—'
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
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
