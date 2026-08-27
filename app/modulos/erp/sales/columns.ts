import { createTableBuilder } from '~/composables/table/createColumns'
import { useIdColumn } from '~/composables/table/useIdColumn'
import { STATUS_LABELS, STATUS_COLORS } from './types/sales.types'
import type { Document } from '~/modulos/erp/facturas/types/factura.types'

type Row = Document

export const createSalesColumns = (actions: {
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
        accessorFn: (row) => {
          const code = row.document_types?.code ?? ''
          const pointOfSale = row.document_sequences?.point_of_sale
          const number = String(row.number).padStart(8, '0')

          // La secuencia del documento es la fuente de verdad. Los registros
          // históricos sin FK conservan el formato anterior.
          return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
        }
      },
      {
        id: 'point_of_sale',
        label: 'Punto de venta',
        accessorFn: (row) => row.document_sequences?.point_of_sale ?? '-'
      },
      { key: 'date', label: 'Fecha', sortable: true, date: true },
      {
        id: 'client',
        label: 'Cliente',
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
