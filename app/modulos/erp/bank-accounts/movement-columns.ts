import type { BankAccountMovement } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import type { BadgeColor } from '@/composables/table/createColumns'

type Row = BankAccountMovement

const isInvestmentMovement = (row: Row) =>
  row.reference_type === 'financial_investment'
  || row.operation?.operation_type === 'INVESTMENT'

const isPaymentReversal = (row: Row) =>
  row.reference_type === 'payment_reversal'
  || /^reversión de pago\b/i.test(row.description?.trim() ?? '')

export const getMovementSignedAmount = (row: Row) => {
  const amount = Number(row.amount ?? 0)
  const balanceBefore = Number(row.balance_before)
  const balanceAfter = Number(row.balance_after)

  // El efecto sobre el saldo es la fuente más confiable para movimientos
  // históricos, donde el importe se guardaba siempre como valor positivo.
  if (Number.isFinite(balanceBefore) && Number.isFinite(balanceAfter)) {
    const balanceDelta = Math.round((balanceAfter - balanceBefore) * 100) / 100
    if (balanceDelta !== 0 || amount === 0) return balanceDelta
  }

  if (row.nature === 'DEBIT') return -Math.abs(amount)
  if (row.nature === 'CREDIT') return Math.abs(amount)

  const side = MOVEMENT_TYPE_CONFIG[row.type]?.side
  if (side === 'out') return -Math.abs(amount)
  if (side === 'in') return Math.abs(amount)
  return amount
}

const investmentMovementLabel = (row: Row) =>
  getMovementSignedAmount(row) < 0 ? 'Constitución' : 'Rescate / vencimiento'

export const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: BadgeColor; side: 'in' | 'out' }> = {
  OPENING_BALANCE: { label: 'Saldo inicial', color: 'neutral', side: 'in' },
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
  TAX: { label: 'Impuesto bancario', color: 'error', side: 'out' },
  RETENTION: { label: 'Retención bancaria', color: 'warning', side: 'out' },
}

export const getMovementTypeBadge = (row: Row): { label: string; color: BadgeColor } => {
  if (isPaymentReversal(row)) {
    return {
      label: 'Reversión de pago',
      color: getMovementSignedAmount(row) >= 0 ? 'success' : 'error'
    }
  }
  if (isInvestmentMovement(row)) {
    return {
      label: investmentMovementLabel(row),
      color: getMovementSignedAmount(row) < 0 ? 'info' : 'success'
    }
  }
  const config = MOVEMENT_TYPE_CONFIG[row.type]
  return { label: config?.label ?? row.type, color: config?.color ?? 'neutral' }
}

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_CONFIG).map(([value, config]) => ({
  label: config.label,
  value
}))

const MOVEMENT_TYPE_FILTER_OPTIONS = [
  ...Object.values(MOVEMENT_TYPE_CONFIG).map(({ label }) => label),
  'Reversión de pago',
  'Constitución',
  'Rescate / vencimiento'
].map(label => ({ label, value: label }))

const getMovementConcept = (row: Row) => {
  const name = row.concept_name_snapshot ?? row.bank_concept?.name
  if (name) return name
  if (isInvestmentMovement(row)) return 'Inversión financiera'
  return '—'
}

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
        id: 'movement_type_label',
        accessorFn: row => getMovementTypeBadge(row).label,
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: getMovementTypeBadge
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: MOVEMENT_TYPE_FILTER_OPTIONS
          }
        }
      },
      {
        id: 'concept',
        accessorFn: getMovementConcept,
        label: 'Concepto',
        cell: ({ row }) => getMovementConcept(row.original)
      },
      {
        id: 'amount',
        accessorFn: getMovementSignedAmount,
        label: 'Monto',
        sortable: true,
        meta: {
          filter: {
            type: 'number',
            operators: ['equals', 'gt', 'lt']
          }
        },
        cell: ({ row }) => {
          const value = row.original.amount
          if (value == null) return '—'
          const numValue = getMovementSignedAmount(row.original)
          const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Math.abs(numValue))
          return `${numValue >= 0 ? '+' : '-'} ${formatted}`
        }
      },
      {
        id: 'balance_before',
        accessorFn: row => Number(row.balance_before),
        label: 'Saldo ant.',
        meta: {
          filter: {
            type: 'number',
            operators: ['equals', 'gt', 'lt']
          }
        },
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
        id: 'balance_after',
        accessorFn: row => Number(row.balance_after),
        label: 'Saldo',
        sortable: true,
        meta: {
          filter: {
            type: 'number',
            operators: ['equals', 'gt', 'lt']
          }
        },
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
