import type { BankAccount } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'

type Row = BankAccount

const accountTypeConfig: Record<string, { label: string; color?: string }> = {
  SAVINGS: { label: 'Caja de ahorro', color: 'info' },
  CHECKING: { label: 'Cuenta corriente', color: 'primary' },
  SALARY: { label: 'Cuenta sueldo', color: 'success' },
  OTHER: { label: 'Otra', color: 'neutral' }
}

export const bankAccountColumns = (actions: {
  onMovements?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<Row>(actions.onMovements),

    ...build([
      {
        key: 'name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'bank_name',
        label: 'Banco',
        sortable: true
      },
      {
        key: 'account_type',
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: (row) => {
            const config = accountTypeConfig[row.account_type]
            return {
              label: config?.label ?? row.account_type,
              color: (config?.color as any) ?? 'neutral'
            }
          }
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(accountTypeConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        key: 'currency_code',
        label: 'Moneda',
        sortable: true
      },
      {
        key: 'balance',
        label: 'Saldo',
        sortable: true,
        cell: ({ row }) => {
          const value = row.original.balance
          if (value == null) return '—'
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: row.original.currency_code || 'ARS',
            maximumFractionDigits: 2
          }).format(Number(value))
        }
      },
      {
        key: 'active',
        label: 'Estado',
        badge: {
          resolve: (row) => ({
            label: row.active ? 'Activa' : 'Inactiva',
            color: row.active ? 'success' : 'neutral'
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Activa', value: true },
              { label: 'Inactiva', value: false }
            ]
          }
        }
      },
      {
        key: 'created_at',
        label: 'Creado',
        sortable: true,
        date: true
      }
    ])
  ]
}
