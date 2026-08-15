import { createTableBuilder } from '~/composables/table/createColumns'
import { useIdColumn } from '~/composables/table/useIdColumn'
import { STATUS_LABELS, STATUS_COLORS } from './types/purchases-documents'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'

type Row = Document

export const createPurchasesColumns = (actions: {
  onOpen: (row: Row) => void
}) => {
  const build = createTableBuilder<Row>({ locale: 'es-AR' })

  return [
    useIdColumn<Row>(actions.onOpen),
    ...build([
      {
        key: 'number',
        label: 'Nº',
        sortable: true,
        accessorFn: (row) => `${row.document_types?.code}-${String(row.number).padStart(8, '0')}`
      },
      { key: 'date', label: 'Fecha', sortable: true, date: true },
      {
        id: 'supplier',
        label: 'Proveedor',
        accessorFn: (row) => row.business_parties?.name ?? '-'
      },
      {
        key: 'descrip',
        label: 'Descripción',
        cell: ({ row }) => row.original.descrip ?? '-'
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
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (doc) => ({
            label: STATUS_LABELS[doc.status] ?? String(doc.status),
            color: STATUS_COLORS[doc.status] as any
          })
        }
      }
    ])
  ]
}
