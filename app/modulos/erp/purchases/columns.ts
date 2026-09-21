import { h } from 'vue'
import { UTooltip, UButton, UBadge, UProgress } from '#components'
import { createTableBuilder } from '~/composables/table/createColumns'
import { CATEGORY_LABELS, getStatusLabel, getStatusColor } from '~/modulos/erp/documents/types/document-statuses'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'
import { getDocumentPaymentSummary } from '~/modulos/erp/documents/utils/document-payment-status'

type Row = Document

export const createPurchasesColumns = (actions: {
  onOpen: (row: Row) => void
}) => {
  const build = createTableBuilder<Row>({ locale: 'es-AR' })
  const fmtNumber = (row: Row) =>
    `${row.document_types?.code ?? ''}-${String(row.number).padStart(8, '0')}`

  return [
    ...build([
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (doc) => ({
            label: getStatusLabel(doc.document_types?.category, doc.status),
            color: getStatusColor(doc.document_types?.category, doc.status) as any
          })
        }
      },
      {
        key: 'number',
        label: 'Comprobante',
        sortable: true,
        accessorFn: (row) => fmtNumber(row),
        cell: ({ row }) => {
          const label = fmtNumber(row.original)
          const category = row.original.document_types?.category ?? ''
          return h('div', { class: 'min-w-[190px] space-y-1' }, [
            h(UButton, { label, variant: 'link', size: 'sm', class: 'font-mono px-0 h-auto', onClick: () => actions.onOpen(row.original) }),
            h('div', { class: 'flex items-center gap-2' }, [
              h(UBadge, { label: CATEGORY_LABELS[category] ?? category, color: 'neutral', variant: 'subtle', size: 'xs' }),
              h('span', { class: 'max-w-[150px] truncate text-xs text-muted' }, row.original.document_types?.description ?? '')
            ])
          ])
        }
      },
      {
        id: 'payment_status',
        label: 'Pago',
        cell: ({ row }) => {
          const summary = getDocumentPaymentSummary(row.original)
          if (!summary.applies) return h('span', { class: 'text-xs text-muted' }, 'No aplica')
          const config = summary.state === 'PAID'
            ? { label: 'Pagado', color: 'success' }
            : summary.state === 'PARTIAL'
              ? { label: 'Pago parcial', color: 'warning' }
              : { label: 'Pendiente', color: 'error' }
          const currency = row.original.currency_code ?? 'ARS'
          const amount = new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(summary.pending)
          return h('div', { class: 'min-w-[140px] space-y-1.5' }, [
            h('div', { class: 'flex items-center justify-between gap-2' }, [
              h(UBadge, { label: config.label, color: config.color as any, variant: 'subtle', size: 'xs' }),
              summary.state !== 'PAID' ? h('span', { class: 'text-xs text-muted' }, `${amount} pend.`) : null
            ]),
            h(UProgress, { modelValue: summary.percentage, color: config.color as any, size: 'xs' })
          ])
        }
      },
      {
        id: 'supplier',
        label: 'Proveedor',
        accessorFn: (row) => row.business_parties?.name ?? '-'
      },
      {
        key: 'descrip',
        label: 'Descripción',
        cell: ({ row }) => {
          const text = row.original.descrip
          if (!text) return '-'
          return h(
            UTooltip,
            {
              text,
              content: { side: 'top' as any }
            },
            () =>
              h(
                'span',
                {
                  class: 'block max-w-[180px] truncate'
                },
                text
              )
          )
        }
      },
      {
        key: 'total',
        label: 'Total',
        sortable: true,
        cell: ({ row }) =>
          new Intl.NumberFormat('es-AR', { style: 'currency', currency: row.original.currency_code ?? 'ARS' }).format(
            Number(row.original.total)
          )
      },
      { key: 'date', label: 'Fecha', sortable: true, date: true }
    ])
  ]
}
