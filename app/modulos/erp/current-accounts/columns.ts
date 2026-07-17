import type { CurrentAccountEntry } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'

type Row = CurrentAccountEntry

export const ENTRY_TYPE_CONFIG: Record<string, { label: string; color?: string; side?: 'debit' | 'credit' }> = {
  PAYMENT: { label: 'Pago', color: 'error', side: 'debit' },
  COLLECTION: { label: 'Cobro', color: 'success', side: 'credit' },
  ADVANCE: { label: 'Anticipo', color: 'info', side: 'credit' },
  LOAN: { label: 'Préstamo', color: 'primary', side: 'credit' },
  LOAN_PAYMENT: { label: 'Pago préstamo', color: 'warning', side: 'debit' },
  ADJUSTMENT: { label: 'Ajuste', color: 'neutral', side: 'debit' },
  TRANSFER: { label: 'Transferencia', color: 'info', side: 'debit' },
  CHECK_ISSUED: { label: 'Cheque emitido', color: 'warning', side: 'debit' },
  CHECK_RECEIVED: { label: 'Cheque recibido', color: 'success', side: 'credit' },
  INVOICE: { label: 'Factura', color: 'primary', side: 'debit' },
  CREDIT_NOTE: { label: 'Nota de crédito', color: 'success', side: 'credit' },
  DEBIT_NOTE: { label: 'Nota de débito', color: 'secondary', side: 'debit' },
  NO_DEBIT: { label: 'No débito', color: 'neutral', side: 'credit' },
  DEBIT: { label: 'Débito', color: 'warning', side: 'debit' },
  CREDIT: { label: 'Crédito', color: 'success', side: 'credit' }
}

export const currentAccountEntryColumns = (actions: {
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
            const config = ENTRY_TYPE_CONFIG[row.type]
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
            options: Object.entries(ENTRY_TYPE_CONFIG).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'user_name',
        label: 'Usuario',
        sortable: true,
        cell: ({ row }) => row.original.user_name ?? '—'
      },
      {
        key: 'debit',
        label: 'Debe',
        cell: ({ row }) => {
          const config = ENTRY_TYPE_CONFIG[row.original.type]
          if (config?.side !== 'debit') return '—'
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
        key: 'credit',
        label: 'Haber',
        cell: ({ row }) => {
          const config = ENTRY_TYPE_CONFIG[row.original.type]
          if (config?.side !== 'credit') return '—'
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
