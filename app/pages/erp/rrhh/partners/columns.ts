import { h } from 'vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useSelectColumn } from '@/composables/table/useSelectColumn'
import { useIdColumn } from '@/composables/table/useIdColumn'
import type { Partner } from '~/modulos/erp/partners/types/partners.types'

type Row = Partner

type BadgeColor = 'error' | 'primary' | 'warning' | 'secondary' | 'success' | 'info' | 'neutral'

export const partnerColumns = (actions: {
  onEdit?: (row: Row) => void
  onReport?: (row: Row) => void
  onSortFieldSelect?: (columnId: string) => void
}): ExtendedColumn<Row>[] => {
  const build = createTableBuilder<Row>({
    locale: 'es-AR',
    onSortFieldSelect: actions.onSortFieldSelect
  })

  return [
    useSelectColumn(),
    useIdColumn(actions.onEdit),

    ...build([
      {
        key: 'first_name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'last_name',
        label: 'Apellido',
        sortable: true
      },
      {
        key: 'document_type',
        label: 'Doc. Tipo',
        sortable: true
      },
      {
        key: 'document_number',
        label: 'Documento',
        sortable: true
      },
      {
        key: 'share_percentage',
        label: '% Participación',
        sortable: true
      },
      {
        key: 'capital_contributed',
        label: 'Capital',
        sortable: true
      },
      {
        key: 'user',
        label: 'Usuario',
        sortable: false,
        badge: {
          resolve: (row: any) => {
            if (row.user) {
              return { label: row.user.name, color: 'success' as BadgeColor }
            }
            return { label: 'Sin usuario', color: 'neutral' as BadgeColor }
          }
        }
      },
      {
        key: 'is_active',
        label: 'Estado',
        sortable: true,
        badge: {
          resolve: (row) => ({
            label: row.is_active ? 'Activo' : 'Inactivo',
            color: row.is_active ? 'success' : 'error'
          })
        },
        meta: {
          filter: {
            type: 'select',
            operators: ['equals'],
            options: [
              { label: 'Activo', value: true },
              { label: 'Inactivo', value: false }
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
    ]),

    // Columna de acciones: Reporte
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        const partyId = row.original?.party_id ?? row.original?.id
        return h('div', { class: 'flex gap-1' }, [
          h('button', {
            class: 'p-1.5 rounded-md hover:bg-muted transition-colors text-primary',
            title: 'Ver reporte',
            onClick: () => actions.onReport?.(row.original)
          }, [
            h('span', { class: 'i-lucide-bar-chart-3 size-4' })
          ])
        ])
      }
    }
  ]
}
