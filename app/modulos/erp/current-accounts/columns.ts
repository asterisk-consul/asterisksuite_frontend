import { h } from 'vue'
import { NuxtLink } from '#components'
import type { CurrentAccountEntry } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { resolveSide } from './utils'
import DocumentChainPopover from '~/components/current-account/DocumentChainPopover.vue'

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
  SUELDO: { label: 'Recibo de sueldo', color: 'primary', side: 'credit' },
  CREDIT_NOTE: { label: 'Nota de crédito', color: 'success', side: 'credit' },
  DEBIT_NOTE: { label: 'Nota de débito', color: 'secondary', side: 'debit' },
  NO_DEBIT: { label: 'No débito', color: 'neutral', side: 'credit' },
  DEBIT: { label: 'Débito', color: 'warning', side: 'debit' },
  CREDIT: { label: 'Crédito', color: 'success', side: 'credit' },
  OPENING_BALANCE: { label: 'Saldo inicial', color: 'info', side: 'credit' }
}

function resolveReferenceLink(entry: CurrentAccountEntry, partyType?: string): { to: string; label: string } | null {
  if (entry.payment_id || entry.reference_type === 'payment') {
    const id = entry.payment_id ?? entry.reference_id
    if (id) return { to: `/erp/treasury/payments/${id}`, label: 'Pago' }
  }
  if (entry.reference_type === 'document' || entry.reference_type === 'document_reversal') {
    if (!entry.reference_id) return null
    if (partyType === 'CUSTOMER') {
      return { to: `/erp/sales/${entry.reference_id}`, label: 'Factura' }
    }
    return { to: `/erp/purchases/purchases-documents/${entry.reference_id}`, label: 'Factura' }
  }
  return null
}

function formatCurrency(amount: number | string | null | undefined, currency = 'ARS'): string {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num)
}

export const currentAccountEntryColumns = (actions: {
  onSortFieldSelect?: (columnId: string) => void
  partyType?: string
  baseCurrency?: string
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  const baseCurrency = actions?.baseCurrency ?? 'ARS'

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
            let label = config?.label ?? row.type

            if (row.type === 'INVOICE' && (actions?.partyType === 'EMPLOYEE' || actions?.partyType === 'PARTNER')) {
              label = 'Recibo de sueldo'
            }

            return {
              label,
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
        key: 'reference',
        label: 'Comprobante',
        cell: ({ row }) => {
          const entry = row.original
          const link = resolveReferenceLink(entry, actions?.partyType)
          if (!link) return '—'
          const text = entry.description || link.label
          const hasChain = entry.document_chain && entry.document_chain.length > 1
          return h('div', { class: 'inline-flex items-center gap-1' }, [
            h(
              NuxtLink,
              {
                to: link.to,
                class: 'inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium'
              },
              () => [
                h('span', text),
                h('i', { class: 'i-lucide-external-link text-xs' })
              ]
            ),
            hasChain
              ? h(DocumentChainPopover, { chain: entry.document_chain!, partyType: actions?.partyType })
              : null
          ])
        }
      },
      {
        key: 'user_name',
        label: 'Usuario',
        sortable: true,
        cell: ({ row }) => row.original.user_name ?? '—'
      },
      {
        key: 'original_amount',
        label: 'Monto original',
        cell: ({ row }) => {
          const value = row.original.amount
          if (value == null) return '—'
          const currency = row.original.currency_code || baseCurrency
          return h('div', { class: 'text-sm' }, [
            h('span', {}, formatCurrency(value, currency)),
            row.original.exchange_rate
              ? h('span', { class: 'text-xs text-muted ml-1' }, `@ ${row.original.exchange_rate}`)
              : null
          ])
        }
      },
      {
        key: 'debit',
        label: 'Debito',
        cell: ({ row }) => {
          if (resolveSide(row.original.type, actions?.partyType) !== 'debit') return '—'
          const value = row.original.converted_amount ?? row.original.amount
          if (value == null) return '—'
          return h('span', { class: 'font-medium' }, formatCurrency(value, baseCurrency))
        }
      },
      {
        key: 'credit',
        label: 'Credito',
        cell: ({ row }) => {
          if (resolveSide(row.original.type, actions?.partyType) !== 'credit') return '—'
          const value = row.original.converted_amount ?? row.original.amount
          if (value == null) return '—'
          return h('span', { class: 'font-medium' }, formatCurrency(value, baseCurrency))
        }
      },
      {
        key: 'balance_before',
        label: 'Saldo ant.',
        cell: ({ row }) => {
          const value = row.original.balance_before
          if (value == null) return '—'
          return formatCurrency(value, baseCurrency)
        }
      },
      {
        key: 'balance_after',
        label: 'Saldo',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.balance_after
          if (value == null) return '—'
          return h('span', { class: 'font-semibold' }, formatCurrency(value, baseCurrency))
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
