import type { TableColumn } from '@nuxt/ui'
import { createTableBuilder } from '@/composables/table/createColumns'
import { useIdColumn } from '@/composables/table/useIdColumn'
import type { CostTemplate, CostComponent } from '../types/cost-template.types'
import {
  COST_COMPONENT_TYPE_LABELS,
  COST_VALUE_TYPE_LABELS,
  COST_COMPONENT_TYPE_COLORS
} from '../types/cost-template.types'

// =========================
// TEMPLATES
// =========================

export const costTemplateColumns = (actions: {
  onEdit?: (row: CostTemplate) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<CostTemplate>[] => {
  const build = createTableBuilder<CostTemplate>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<CostTemplate>(actions.onEdit),

    ...build([
      {
        key: 'name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'description',
        label: 'Descripción',
        cell: ({ row }) => row.original.description ?? '—'
      },
      {
        key: 'is_default',
        label: 'Default',
        badge: {
          resolve: (row) => ({
            label: row.is_default ? 'Default' : 'Normal',
            color: row.is_default ? 'primary' : 'neutral'
          })
        }
      },
      {
        key: 'active',
        label: 'Estado',
        badge: {
          resolve: (row) => ({
            label: row.active ? 'Activo' : 'Inactivo',
            color: row.active ? 'success' : 'neutral'
          })
        }
      },
      {
        id: 'components_count',
        label: 'Componentes',
        cell: ({ row }) => `${row.original.components?.length ?? 0} componentes`
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

// =========================
// COMPONENTS
// =========================

export const costComponentColumns = (actions: {
  onEdit?: (row: CostComponent) => void
  onSortFieldSelect?: (columnId: string) => void
}): TableColumn<CostComponent>[] => {
  const build = createTableBuilder<CostComponent>({
    locale: 'es-AR',
    onSortFieldSelect: actions?.onSortFieldSelect
  })

  return [
    useIdColumn<CostComponent>(actions.onEdit),

    ...build([
      {
        key: 'name',
        label: 'Nombre',
        sortable: true
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        badge: {
          resolve: (row) => ({
            label: COST_COMPONENT_TYPE_LABELS[row.type] ?? row.type,
            color: COST_COMPONENT_TYPE_COLORS[row.type] ?? 'neutral'
          })
        }
      },
      {
        key: 'value_type',
        label: 'Cálculo',
        badge: {
          resolve: (row) => ({
            label: COST_VALUE_TYPE_LABELS[row.value_type] ?? row.value_type,
            color: 'neutral'
          })
        }
      },
      {
        key: 'value',
        label: 'Valor',
        cell: ({ row }) => {
          const v = row.original.value
          if (v === null || v === undefined) return '—'
          if (
            row.original.value_type === 'PERCENTAGE_OF_MATERIAL' ||
            row.original.value_type === 'PERCENTAGE_OF_TOTAL'
          ) {
            return `${(v * 100).toFixed(0)}%`
          }
          return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(v)
        }
      },
      {
        key: 'order',
        label: 'Orden',
        sortable: true
      },
      {
        key: 'active',
        label: 'Estado',
        badge: {
          resolve: (row) => ({
            label: row.active ? 'Activo' : 'Inactivo',
            color: row.active ? 'success' : 'neutral'
          })
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
