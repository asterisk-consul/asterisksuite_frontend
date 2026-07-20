import { h } from 'vue'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'
import StatusToggle from '@/components/ui/PopoverTableActive.vue'
import { UButton } from '#components'

type Row = Check

const statusConfig: Record<string, { label: string; color?: string }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  CLEARED: { label: 'Liquidado', color: 'success' },
  BOUNCED: { label: 'Rechazado', color: 'error' },
  REJECTED: { label: 'Rechazado', color: 'error' },
  CANCELLED: { label: 'Cancelado', color: 'neutral' }
}

function getAvailableStatuses(row: Check) {
  const all = [
    { value: 'PENDING', label: 'Pendiente', color: 'warning' as const },
    { value: 'CONFIRMED', label: 'Confirmar', color: 'info' as const },
    { value: 'CLEARED', label: 'Liquidar', color: 'success' as const },
    { value: 'BOUNCED', label: 'Rechazar (bounce)', color: 'error' as const },
    { value: 'CANCELLED', label: 'Cancelar', color: 'neutral' as const },
  ]

  if (row.status === 'CLEARED' || row.status === 'CANCELLED' || row.status === 'BOUNCED') {
    return all.map(o => ({
      ...o,
      disabled: o.value !== row.status
    }))
  }

  if (row.is_own) {
    return all.map(o => ({
      ...o,
      disabled: !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(o.value as string) || o.value === row.status
    }))
  }

  return all.map(o => ({
    ...o,
    disabled: !['PENDING', 'CONFIRMED', 'CLEARED', 'BOUNCED'].includes(o.value as string) || o.value === row.status
  }))
}

export const checkColumns = (actions: {
  onDetail?: (row: Row) => void
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
  onStatusChange?: (row: Row, newStatus: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<Row>(actions.onDetail),

    ...build([
      {
        key: 'check_number',
        label: 'N° Cheque',
        sortable: true
      },
      {
        key: 'bank_name',
        label: 'Banco emisor',
        sortable: true
      },
      {
        key: 'issuer_name',
        label: 'Emisor',
        sortable: true
      },
      {
        key: 'amount',
        label: 'Monto',
        sortable: true,
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
        key: 'issue_date',
        label: 'Emisión',
        sortable: true,
        date: true
      },
      {
        key: 'due_date',
        label: 'Vencimiento',
        sortable: true,
        date: true
      },
      {
        key: 'is_own',
        label: 'Tipo',
        badge: {
          resolve: (row) => ({
            label: row.is_own ? 'Propio' : 'Tercero',
            color: row.is_own ? 'info' : 'neutral'
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Propio', value: true },
              { label: 'Tercero', value: false }
            ]
          }
        }
      },
      {
        id: 'party_name',
        label: 'Cliente / Proveedor',
        accessorFn: (row) => row.payment?.party?.name ?? '—',
        cell: ({ row }) => {
          const party = row.original.payment?.party
          if (!party) return '—'
          return h('div', { class: 'flex flex-col' }, [
            h('span', { class: 'text-sm font-medium' }, party.name),
            h('span', { class: 'text-xs text-muted' }, party.type === 'CUSTOMER' ? 'Cliente' : 'Proveedor')
          ])
        }
      },
      {
        id: 'bank_account_info',
        label: 'Cuenta bancaria',
        accessorFn: (row) => row.bank_account ? `${row.bank_account.bank_name} - ${row.bank_account.name}` : '—',
        cell: ({ row }) => {
          const ba = row.original.bank_account
          if (!ba) return h('span', { class: 'text-muted text-xs' }, 'Sin cuenta asignada')
          return h('div', { class: 'flex flex-col' }, [
            h('span', { class: 'text-sm' }, ba.name),
            h('span', { class: 'text-xs text-muted' }, ba.bank_name)
          ])
        }
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        cell: ({ row }) => {
          const options = getAvailableStatuses(row.original)
          return h(StatusToggle, {
            modelValue: row.original.status,
            options,
            title: 'Cambiar estado',
            'onUpdate:modelValue': (value: string) => actions.onStatusChange?.(row.original, value)
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: Object.entries(statusConfig).map(([value, config]) => ({
              label: config.label,
              value
            }))
          }
        }
      },
      {
        id: 'actions',
        label: '',
        cell: ({ row }) => h('div', { class: 'flex gap-1' }, [
          h(UButton, {
            icon: 'i-lucide-pencil',
            size: 'xs',
            variant: 'ghost',
            color: 'neutral',
            onClick: () => actions.onEdit?.(row.original)
          }),
          h(UButton, {
            icon: 'i-lucide-trash-2',
            size: 'xs',
            variant: 'ghost',
            color: 'error',
            onClick: () => actions.onDelete?.(row.original)
          })
        ])
      }
    ])
  ]
}
