import type { PaymentByUserReport } from '~/modulos/erp/payment-reports/types/payment-reports.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'

type Row = PaymentByUserReport

export const paymentByUserColumns = (actions: {
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    ...build([
      {
        key: 'user_name',
        label: 'Usuario',
        sortable: true
      },
      {
        key: 'currency_code',
        label: 'Moneda',
        sortable: true
      },
      {
        key: 'count',
        label: 'Cantidad',
        sortable: true
      },
      {
        key: 'total_amount',
        label: 'Total',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.total_amount
          if (value == null) return '—'
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
        }
      }
    ])
  ]
}
