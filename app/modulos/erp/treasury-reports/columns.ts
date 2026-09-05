import type { TreasuryMovement } from '~/modulos/erp/treasury-reports/types/treasury-reports.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'

type Row = TreasuryMovement

export const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string; side: 'in' | 'out' }> = {
  PAYMENT: { label: 'Pago', color: 'error', icon: 'i-lucide-send', side: 'out' },
  COLLECTION: { label: 'Cobro', color: 'success', icon: 'i-lucide-hand-coins', side: 'in' },
  ADVANCE: { label: 'Anticipo', color: 'info', icon: 'i-lucide-rocket', side: 'in' },
  LOAN: { label: 'Préstamo', color: 'warning', icon: 'i-lucide-landmark', side: 'out' },
  LOAN_PAYMENT: { label: 'Pago préstamo', color: 'warning', icon: 'i-lucide-credit-card', side: 'out' },
  ADJUSTMENT: { label: 'Ajuste', color: 'neutral', icon: 'i-lucide-sliders', side: 'in' },
  TRANSFER: { label: 'Transferencia', color: 'info', icon: 'i-lucide-arrow-left-right', side: 'in' },
  CHECK_ISSUED: { label: 'Cheque emitido', color: 'error', icon: 'i-lucide-square-minus', side: 'out' },
  CHECK_RECEIVED: { label: 'Cheque recibido', color: 'success', icon: 'i-lucide-square-plus', side: 'in' },
  CHECK_BOUNCED: { label: 'Cheque rechazado', color: 'error', icon: 'i-lucide-x-circle', side: 'out' },
  DEBIT: { label: 'Débito', color: 'error', icon: 'i-lucide-minus-circle', side: 'out' },
  CREDIT: { label: 'Crédito', color: 'success', icon: 'i-lucide-plus-circle', side: 'in' },
  INVOICE: { label: 'Factura', color: 'warning', icon: 'i-lucide-file-text', side: 'out' },
  CREDIT_NOTE: { label: 'Nota de crédito', color: 'success', icon: 'i-lucide-file-minus', side: 'in' },
  DEBIT_NOTE: { label: 'Nota de débito', color: 'error', icon: 'i-lucide-file-plus', side: 'out' },
}

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_CONFIG).map(([value, config]) => ({
  label: config.label,
  value
}))

export const sourceConfig: Record<string, { label: string; color?: string }> = {
  bank: { label: 'Banco', color: 'info' },
  cash_box: { label: 'Caja', color: 'success' }
}

export const treasuryMovementColumns = (actions: {
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
        key: 'source',
        label: 'Origen',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = sourceConfig[row.source]
            return {
              label: config?.label ?? row.source,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(sourceConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'source_name',
        label: 'Origen',
        sortable: true
      },
      {
        key: 'user_name',
        label: 'Usuario',
        sortable: true,
        cell: ({ row }) => row.original.user_name ?? '—'
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
          const typeConfig = MOVEMENT_TYPE_CONFIG[row.original.type]
          const isOut = typeConfig?.side === 'out'
          return `${isOut ? '-' : '+'}${new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))}`
        }
      },
      {
        key: 'currency_code',
        label: 'Moneda',
        sortable: true
      },
      {
        key: 'description',
        label: 'Descripción',
        cell: ({ row }) => row.original.description ?? '—'
      }
    ])
  ]
}
