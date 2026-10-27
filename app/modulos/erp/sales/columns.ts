import { h } from 'vue'
import { UTooltip, UButton, UBadge, UProgress, UDropdownMenu } from '#components'
import { createTableBuilder } from '~/composables/table/createColumns'
import { CATEGORY_LABELS, getStatusLabel, getStatusColor } from '~/modulos/erp/documents/types/document-statuses'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'
import { canSettleDocument, getDocumentPaymentSummary } from '~/modulos/erp/documents/utils/document-payment-status'
import { getOrderFlowPresentation } from '~/modulos/erp/documents/orden-venta/order-flow-status'

type Row = Document

export const createSalesColumns = (actions: {
  onOpen: (row: Row) => void
  onCollect?: (row: Row) => void
  onDuplicate?: (row: Row) => void
  canDuplicate?: (row: Row) => boolean
  showAmounts?: boolean
  showCreator?: boolean
  statusFilterOptions?: { label: string; value: number }[] | null
}) => {
  const build = createTableBuilder<Row>({ locale: 'es-AR' })
  const fmtNumber = (row: Row) => {
    const code = row.document_types?.code ?? ''
    const pointOfSale = row.document_sequences?.point_of_sale
    const number = String(row.number).padStart(8, '0')

    // La secuencia del documento es la fuente de verdad. Los registros
    // históricos sin FK conservan el formato anterior.
    return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
  }

  return [
    ...build([
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        meta: {
          filter: actions.statusFilterOptions === null
            ? false
            : actions.statusFilterOptions
              ? { type: 'select', operators: ['equals'], options: actions.statusFilterOptions }
              : { type: 'number', operators: ['equals'] }
        },
        badge: {
          resolve: (doc) => {
            const orderFlow = getOrderFlowPresentation(doc)
            return {
              label: orderFlow?.label ?? getStatusLabel(doc.document_types?.category, doc.status),
              color: (orderFlow?.color ?? getStatusColor(doc.document_types?.category, doc.status)) as any
            }
          }
        }
      },
      {
        key: 'number',
        label: 'Comprobante',
        sortable: true,
        meta: { filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
        accessorFn: (row) => fmtNumber(row),
        cell: ({ row }) => {
          const label = fmtNumber(row.original)
          const category = row.original.document_types?.category ?? ''
          return h('div', { class: 'min-w-[190px] space-y-1' }, [
            h(UButton, {
              label,
              variant: 'link',
              size: 'sm',
              class: 'font-mono px-0 h-auto',
              onClick: () => actions.onOpen(row.original)
            }),
            h('div', { class: 'flex items-center gap-2' }, [
              h(UBadge, {
                label: CATEGORY_LABELS[category] ?? category,
                color: 'neutral',
                variant: 'subtle',
                size: 'xs'
              }),
              h(
                'span',
                { class: 'max-w-[150px] truncate text-xs text-muted' },
                row.original.document_types?.description ?? ''
              )
            ])
          ])
        }
      },
      {
        id: 'payment_status',
        label: 'Cobro',
        cell: ({ row }) => {
          if (row.original.amounts_visible === false) {
            const percentage = Number(row.original.monetary_visibility?.paid_percentage ?? 0)
            const required = Number(row.original.monetary_visibility?.required_percentage ?? 0)
            const ready = percentage + 0.0001 >= required
            return h('div', { class: 'min-w-[170px] space-y-1.5' }, [
              h(UBadge, {
                label: ready ? 'Condición cumplida' : 'Cobro requerido pendiente',
                color: ready ? 'success' : 'warning',
                variant: 'subtle',
                size: 'xs'
              }),
              h(UProgress, { modelValue: percentage, color: ready ? 'success' : 'warning', size: 'xs' }),
              h(
                'span',
                { class: 'text-xs text-muted' },
                `${percentage.toFixed(1)}% / ${required.toFixed(1)}% requerido`
              )
            ])
          }
          const summary = getDocumentPaymentSummary(row.original)
          if (!summary.applies) return h('span', { class: 'text-xs text-muted' }, 'No aplica')
          const config =
            summary.state === 'PAID'
              ? { label: 'Cobrado', color: 'success' }
              : summary.state === 'PARTIAL'
                ? { label: 'Cobro parcial', color: 'warning' }
                : { label: 'Pendiente', color: 'error' }
          const currency = row.original.currency_code ?? 'ARS'
          const amount = new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(summary.pending)
          return h('div', { class: 'min-w-[170px] space-y-1.5' }, [
            h('div', { class: 'flex items-center justify-between gap-2' }, [
              h(UBadge, { label: config.label, color: config.color as any, variant: 'subtle', size: 'xs' }),
              summary.state !== 'PAID' ? h('span', { class: 'text-xs text-muted' }, `${amount} pend.`) : null
            ]),
            h(UProgress, { modelValue: summary.percentage, color: config.color as any, size: 'xs' }),
            canSettleDocument(row.original) && actions.onCollect
              ? h(UButton, {
                  label: summary.state === 'PARTIAL' ? 'Cobrar saldo' : 'Cobrar',
                  icon: 'i-lucide-hand-coins',
                  size: 'xs',
                  variant: 'soft',
                  color: 'primary',
                  class: 'w-full justify-center',
                  onClick: () => actions.onCollect?.(row.original)
                })
              : null
          ])
        }
      },
      {
        id: 'client',
        label: 'Cliente',
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
      ...(actions.showAmounts === false
        ? []
        : [
            {
              key: 'total',
              label: 'Total',
              sortable: true,
              meta: { filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
              cell: ({ row }) =>
                row.original.amounts_visible === false
                  ? h('span', { class: 'text-xs text-muted' }, 'Restringido')
                  : new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: row.original.currency_code ?? 'ARS'
                    }).format(Number(row.original.total))
            }
          ]),
      { key: 'date', label: 'Fecha', sortable: true, date: true },
      {
        id: 'point_of_sale',
        label: 'Punto de venta',
        meta: { filter: { type: 'number', operators: ['equals'] } },
        accessorFn: (row) => row.document_sequences?.point_of_sale ?? '-'
      },
      ...(actions.showCreator
        ? [
            {
              id: 'creator',
              label: 'Cargado por',
              meta: { filter: false },
              accessorFn: (row: Row) => row.creator?.name ?? row.creator?.email ?? '-'
            }
          ]
        : [])
    ]),
    ...(actions.onDuplicate
      ? [{
          id: 'document_actions',
          header: '',
          meta: { label: 'Acciones', filter: false, disableColumnVisibility: true },
          enableHiding: false,
          cell: ({ row }: any) => {
            const document = row.original as Row
            const category = document.document_types?.category
            if (!['ORDER', 'INVOICE'].includes(category ?? '') || actions.canDuplicate?.(document) === false) return null
            return h(UDropdownMenu, {
              items: [[{
                label: 'Duplicar como borrador',
                icon: 'i-lucide-copy',
                onSelect: () => actions.onDuplicate?.(document)
              }]],
              content: { align: 'end' }
            }, {
              default: () => h(UButton, {
                icon: 'i-lucide-ellipsis-vertical',
                color: 'neutral',
                variant: 'ghost',
                size: 'sm',
                'aria-label': `Acciones para ${CATEGORY_LABELS[category ?? ''] ?? 'documento'}`,
                title: 'Más acciones'
              })
            })
          }
        }]
      : [])
  ]
}
