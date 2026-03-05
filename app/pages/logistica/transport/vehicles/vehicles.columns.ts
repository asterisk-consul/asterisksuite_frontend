import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

interface VehicleDocument {
  id: string
  expiration_date: string
  transport_document_types: {
    name: string
  }
}

interface Vehicle {
  id: string
  plate: string
  type: string
  brand?: string | null
  model?: string | null
  refrigeration: boolean
  vehicleDocuments: VehicleDocument[]
  created_at: string
}

function getDocumentColor(expiration: string) {
  const today = new Date()
  const exp = new Date(expiration)

  const diff = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diff < 0) return 'error'
  if (diff < 30) return 'warning'

  return 'success'
}

export const columns: TableColumn<Vehicle>[] = [
  {
    accessorKey: 'plate',
    header: 'Patente'
  },

  {
    accessorKey: 'type',
    header: 'Tipo'
  },

  {
    id: 'vehicle',
    header: 'Vehículo',
    cell: ({ row }) => {
      const brand = row.original.brand ?? ''
      const model = row.original.model ?? ''

      return `${brand} ${model}`.trim() || '—'
    }
  },

  {
    accessorKey: 'refrigeration',
    header: 'Frío',
    cell: ({ row }) => {
      const refrigeration = row.original.refrigeration

      return h(
        UBadge,
        {
          variant: 'subtle',
          color: refrigeration ? 'info' : 'neutral'
        },
        () => (refrigeration ? 'Refrigerado' : 'Normal')
      )
    }
  },

  {
    id: 'documents',
    header: 'Documentos',
    cell: ({ row }) => {
      const docs = row.original.vehicleDocuments

      if (!docs?.length) return '—'

      return h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        docs.map((doc) =>
          h(
            UBadge,
            {
              variant: 'subtle',
              color: getDocumentColor(doc.expiration_date)
            },
            () => doc.transport_document_types.name
          )
        )
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
