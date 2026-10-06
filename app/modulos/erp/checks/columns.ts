import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { UButton } from '#components'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import StatusToggle from '@/components/ui/PopoverTableActive.vue'

type Row = Check
const statusConfig: Record<string, { label: string }> = {
  PENDING: { label: 'Pendiente' }, CONFIRMED: { label: 'Confirmado' },
  CLEARED: { label: 'Acreditado / debitado' }, BOUNCED: { label: 'Rechazado' },
  REJECTED: { label: 'Rechazado' }, CANCELLED: { label: 'Cancelado' }
}

function getAvailableStatuses(row: Check) {
  const clearedLabel = row.is_own ? 'Debitado' : row.bank_account_id || row.deposit_date ? 'Depositado' : 'Cobrado / aplicado'
  const all = [
    { value: 'PENDING', label: 'Pendiente', color: 'warning' as const },
    { value: 'CONFIRMED', label: 'Confirmar', color: 'info' as const },
    { value: 'CLEARED', label: row.status === 'CLEARED' ? clearedLabel : 'Depositar', badgeLabel: clearedLabel, color: 'success' as const },
    { value: 'BOUNCED', label: 'Rechazar (bounce)', color: 'error' as const },
    { value: 'CANCELLED', label: 'Cancelar', color: 'neutral' as const }
  ]
  if (['CLEARED', 'CANCELLED', 'BOUNCED'].includes(row.status))
    return all.map(option => ({ ...option, disabled: option.value !== row.status }))
  const allowed = row.is_own ? ['PENDING', 'CONFIRMED', 'CANCELLED'] : ['PENDING', 'CONFIRMED', 'CLEARED', 'BOUNCED']
  return all.map(option => ({ ...option, disabled: !allowed.includes(option.value) || option.value === row.status }))
}

export const checkColumns = (actions: {
  onDetail?: (row: Row) => void; onEdit?: (row: Row) => void; onDelete?: (row: Row) => void
  onDeposit?: (row: Row) => void; onResolve?: (row: Row) => void; onProcess?: (row: Row) => void
  onRevert?: (row: Row) => void; onSortFieldSelect?: (columnId: string) => void
  onStatusChange?: (row: Row, newStatus: string) => void
}): TableColumn<Row>[] => {
  const build = createTableBuilder<Row>({ locale: 'es-AR', onSortFieldSelect: actions.onSortFieldSelect })
  return build([
    {
      id: 'check_number', accessorFn: row => `${row.check_number} ${row.bank_name || ''}`, label: 'Cheque', sortable: true,
      cell: ({ row }) => h('button', {
        class: 'group flex min-w-36 flex-col items-start text-left', onClick: () => actions.onDetail?.(row.original)
      }, [
        h('span', { class: 'font-semibold text-highlighted group-hover:text-primary' }, `N° ${row.original.check_number}`),
        h('span', { class: 'text-xs text-muted' }, row.original.bank_name || 'Banco sin informar')
      ]),
      meta: { class: { th: 'min-w-40', td: 'min-w-40' } }
    },
    {
      key: 'status', label: 'Estado', sortable: true,
      cell: ({ row }) => {
        const isOverdue = ['PENDING', 'CONFIRMED'].includes(row.original.status)
          && new Date(row.original.due_date).getTime() < new Date().setHours(0, 0, 0, 0)
        return h('div', { class: 'flex min-w-40 flex-col items-start gap-1' }, [
          h(StatusToggle, {
            modelValue: row.original.status, options: getAvailableStatuses(row.original),
            title: 'Cambiar estado', badgeClass: 'px-2.5 py-1 text-sm font-semibold',
            'onUpdate:modelValue': (value: string) => actions.onStatusChange?.(row.original, value)
          }),
          ...(isOverdue ? [h('span', { class: 'inline-flex items-center gap-1 text-xs font-medium text-error' }, [
            h('span', { class: 'i-lucide-circle-alert size-3.5' }), 'Vencido'
          ])] : [])
        ])
      },
      meta: {
        class: { th: 'min-w-44', td: 'min-w-44' },
        filter: { type: 'select', operators: ['equals'], options: Object.entries(statusConfig).map(([value, config]) => ({ label: config.label, value })) }
      }
    },
    {
      id: 'actions', label: 'Acciones', meta: { class: { th: 'min-w-56', td: 'min-w-56' } },
      cell: ({ row }) => h('div', { class: 'flex min-w-max flex-wrap gap-1' }, [
        ...(row.original.is_own && row.original.status === 'CONFIRMED' && new Date(row.original.due_date).getTime() <= Date.now()
          ? [h(UButton, { icon: 'i-lucide-landmark', size: 'xs', variant: 'soft', color: 'warning', label: 'Procesar débito', onClick: () => actions.onProcess?.(row.original) })] : []),
        ...(!row.original.is_own && ['PENDING', 'CONFIRMED'].includes(row.original.status)
          ? [h(UButton, { icon: 'i-lucide-list-checks', size: 'xs', variant: 'soft', color: 'primary', label: 'Resolver', onClick: () => actions.onResolve?.(row.original) }),
              h(UButton, { icon: 'i-lucide-building-2', size: 'xs', variant: 'ghost', color: 'success', label: 'Depositar', onClick: () => actions.onDeposit?.(row.original) })] : []),
        ...(row.original.status === 'CLEARED' && row.original.bank_account_id
          ? [h(UButton, { icon: 'i-lucide-undo-2', size: 'xs', variant: 'ghost', color: 'warning', label: 'Revertir', onClick: () => actions.onRevert?.(row.original) })] : []),
        ...(row.original.status !== 'CLEARED'
          ? [h(UButton, { icon: 'i-lucide-pencil', size: 'xs', variant: 'ghost', color: 'neutral', label: 'Editar', onClick: () => actions.onEdit?.(row.original) }),
              h(UButton, { icon: 'i-lucide-trash-2', size: 'xs', variant: 'ghost', color: 'error', 'aria-label': 'Eliminar cheque', onClick: () => actions.onDelete?.(row.original) })] : [])
      ])
    },
    {
      key: 'is_own', label: 'Tipo',
      badge: { resolve: row => ({ label: row.is_own ? 'Propio' : 'De tercero', color: row.is_own ? 'info' : 'neutral' }) },
      meta: { filter: { type: 'select', operators: ['equals'], options: [{ label: 'Propio', value: true }, { label: 'Tercero', value: false }] } }
    },
    {
      key: 'amount', label: 'Monto', sortable: true,
      cell: ({ row }) => new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: row.original.currency_code || 'ARS', maximumFractionDigits: 2
      }).format(Number(row.original.amount)),
      meta: { class: { th: 'text-right', td: 'text-right font-semibold whitespace-nowrap' } }
    },
    {
      id: 'party_name', label: 'Cliente / Proveedor', accessorFn: row => row.payment?.party?.name ?? '—',
      cell: ({ row }) => {
        const party = row.original.payment?.party
        return party ? h('div', { class: 'flex min-w-36 flex-col' }, [
          h('span', { class: 'text-sm font-medium' }, party.name),
          h('span', { class: 'text-xs text-muted' }, party.type === 'CUSTOMER' ? 'Cliente' : 'Proveedor')
        ]) : '—'
      }
    },
    { key: 'issuer_name', label: 'Emisor', sortable: true },
    {
      id: 'bank_account_info', label: 'Cuenta bancaria',
      accessorFn: row => row.bank_account ? `${row.bank_account.bank_name} - ${row.bank_account.name}` : '—',
      cell: ({ row }) => {
        const account = row.original.bank_account
        if (!account) {
          const label = row.original.is_own ? 'Sin cuenta asignada' : row.original.status === 'CLEARED' ? '—' : 'Se define al depositar'
          return h('span', { class: 'text-xs text-muted' }, label)
        }
        return h('div', { class: 'flex min-w-36 flex-col' }, [
          h('span', { class: 'text-sm' }, account.name), h('span', { class: 'text-xs text-muted' }, account.bank_name)
        ])
      }
    },
    { key: 'issue_date', label: 'Emisión', sortable: true, date: true, meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap text-muted' } } },
    { key: 'due_date', label: 'Vencimiento', sortable: true, date: true, meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-medium' } } }
  ])
}
