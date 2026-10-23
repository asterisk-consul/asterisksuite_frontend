import { h } from 'vue'
import { NuxtLink, UButton } from '#components'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = Payment

const typeConfig: Record<string, { label: string; color?: string }> = {
  PAYMENT: { label: 'Pago', color: 'error' },
  COLLECTION: { label: 'Cobro', color: 'success' },
  EXPENSE: { label: 'Gastos varios', color: 'warning' }
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
  PAYROLL_DEDUCTION: { label: 'Descuento de haberes', color: 'info' },
  // CREDIT_CARD: { label: 'Tarjeta crédito', color: 'info' },
  // DEBIT_CARD: { label: 'Tarjeta débito', color: 'secondary' },
  // VIRTUAL_WALLET: { label: 'Billetera virtual', color: 'success' }
}

const formatPaymentAmount = (amount: number | string | null | undefined, currency = 'ARS') => {
  if (amount == null) return null
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(Number(amount) || 0)
}

function getDocumentReferences(row: Row) {
  const documents = (row.documents ?? []).map((allocation) => {
    const document = allocation.document
    const kind = document?.document_types?.description ?? document?.document_types?.code ?? 'Comprobante'
    const number = document?.number != null ? `N° ${document.number}` : 'Documento'
    const applied = formatPaymentAmount(allocation.amount_applied, document?.currency_code ?? row.currency_code)
    const moduleCode = document?.document_types?.system_modules?.code
    const to = moduleCode === 'SALES'
      ? `/erp/sales/${document?.id}`
      : moduleCode === 'PURCHASES'
        ? `/erp/purchases/purchases-documents/${document?.id}`
        : undefined
    return {
      label: `${kind} · ${number}`,
      detail: applied ? `Aplicado: ${applied}` : undefined,
      to
    }
  })

  const obligations = (row.obligations ?? []).map((obligation) => {
    const amount = formatPaymentAmount(obligation.amount ?? obligation.estimated_amount, obligation.currency_code)
    return {
      label: obligation.description,
      detail: [`Período ${obligation.period_key}`, amount].filter(Boolean).join(' · ')
    }
  })

  if (documents.length || obligations.length) return [...documents, ...obligations]
  return row.description
    ? [{ label: 'Sin comprobante asociado', detail: row.description }]
    : []
}

function getDocumentSearchText(row: Row) {
  return [
    ...getDocumentReferences(row).flatMap(reference => [reference.label, reference.detail]),
    row.description
  ].filter(Boolean).join(' ')
}

function getAvailableAdvanceAmount(row: Row) {
  if (row.payment_mode !== 'ADVANCE') return null
  const applied = row.documents?.reduce((sum, document) => sum + Number(document.amount_applied), 0) ?? 0
  return Math.max(0, Number(row.amount) - applied)
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
            if (row.payment_mode === 'ADVANCE') {
              return { label: 'Pago (anticipo)', color: 'warning' as const }
            }
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
        id: 'party_name',
        label: 'Tercero',
        accessorFn: (row) => row.party?.name ?? '',
        sortable: true,
        meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
        cell: ({ row }) => row.original.party?.name ?? '—'
      },
      {
        id: 'document_reference',
        label: 'Documento / concepto pagado',
        accessorFn: getDocumentSearchText,
        sortable: true,
        meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
        cell: ({ row }) => {
          const references = getDocumentReferences(row.original)
          if (!references.length) return h('span', { class: 'text-sm text-muted' }, 'Sin documento asociado')
          const visibleReferences = references.slice(0, 2)
          return h('div', { class: 'flex min-w-48 flex-col gap-1' }, [
            ...visibleReferences.map(reference => h('div', { class: 'min-w-0' }, [
              reference.to
                ? h(NuxtLink, {
                    to: reference.to,
                    class: 'block truncate text-sm font-medium text-primary hover:underline',
                    title: `Abrir ${reference.label}`,
                    onClick: (event: MouseEvent) => event.stopPropagation()
                  }, () => reference.label)
                : h('p', { class: 'truncate text-sm font-medium', title: reference.label }, reference.label),
              reference.detail ? h('p', { class: 'truncate text-xs text-muted', title: reference.detail }, reference.detail) : null
            ])),
            references.length > visibleReferences.length
              ? h('span', { class: 'text-xs text-primary' }, `+ ${references.length - visibleReferences.length} más · abrir pago para ver todo`)
              : null
          ])
        }
      },
      {
        key: 'amount',
        label: 'Monto',
        sortable: true,
        meta: { filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
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
        key: 'available_amount',
        label: 'Disponible',
        meta: { filter: false },
        cell: ({ row }) => {
          if (row.original.payment_mode !== 'ADVANCE') return '—'
          const available = getAvailableAdvanceAmount(row.original) ?? 0
          if (available <= 0) return 'Saldado'
          const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(available)
          return h('div', { class: 'flex items-center gap-1' }, [
            h('span', { class: 'text-xs text-warning-600 dark:text-warning-400' }, 'Pendiente de asociar documento'),
            h('span', {}, formatted)
          ])
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
        key: 'description',
        label: 'Descripción',
        cell: ({ row }) => row.original.description ?? '—'
      },
      {
        id: 'account',
        label: 'Cuenta',
        accessorFn: (row: any) => (row.account ? `${row.account.code} - ${row.account.name}` : ''),
        sortable: true,
        meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
        cell: ({ row }) => {
          const acc = (row.original as any).account
          if (!acc) return '—'
          return `${acc.code} - ${acc.name}`
        }
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
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(statusConfig).map(([value, config]) => ({ label: config.label, value }))
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
          } else if (status === 'CANCELLED' || status === 'REVERSED') {
            buttons.push({ icon: 'i-lucide-trash-2', color: 'error', onClick: () => actions.onDelete?.(row.original) })
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
