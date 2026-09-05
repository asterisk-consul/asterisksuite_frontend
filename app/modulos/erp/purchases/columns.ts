import { h } from 'vue'
import { UTooltip, UButton } from '#components'
import { createTableBuilder } from '~/composables/table/createColumns'
import { getStatusLabel, getStatusColor } from '~/modulos/erp/documents/types/document-statuses'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'

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
        label: 'Nº',
        sortable: true,
        accessorFn: (row) => fmtNumber(row),
        cell: ({ row }) => {
          const label = fmtNumber(row.original)
          return h(
            UButton,
            {
              label,
              variant: 'link',
              size: 'sm',
              class: 'font-mono px-0',
              onClick: () => actions.onOpen(row.original)
            }
          )
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
          new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
            Number(row.original.total)
          )
      },
      { key: 'date', label: 'Fecha', sortable: true, date: true }
    ])
  ]
}
