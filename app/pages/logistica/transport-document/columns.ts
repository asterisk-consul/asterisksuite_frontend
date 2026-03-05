import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type {
  DocumentType,
  DocumentEntity
} from '~/types/logistica/transport-document/document-types'

type BadgeColor =
  | 'error'
  | 'primary'
  | 'warning'
  | 'secondary'
  | 'success'
  | 'info'
  | 'neutral'

const entityConfig: Record<
  DocumentEntity,
  { label: string; color: BadgeColor }
> = {
  VEHICLE: { label: 'Vehículo', color: 'primary' },
  DRIVER: { label: 'Chofer', color: 'warning' }
}

export const columns: TableColumn<DocumentType>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => {
      const id = row.getValue('id') as string
      return `#${id.slice(0, 8)}`
    }
  },

  {
    accessorKey: 'name',
    header: 'Nombre'
  },

  {
    accessorKey: 'entity',
    header: 'Entidad',
    cell: ({ row }) => {
      const entity = row.getValue('entity') as DocumentEntity
      const config = entityConfig[entity]

      return h(
        UBadge,
        {
          variant: 'subtle',
          color: config.color
        },
        () => config.label
      )
    }
  },

  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => {
      const active = row.getValue('active') as boolean

      return h(
        UBadge,
        {
          variant: 'subtle',
          color: active ? 'success' : 'error'
        },
        () => (active ? 'Activo' : 'Inactivo')
      )
    }
  },

  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => {
      const date = row.original.created_at

      return new Date(date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
]
