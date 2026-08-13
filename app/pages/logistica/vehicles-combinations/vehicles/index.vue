<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
//stores
import { useVehiclesStore } from '~/modulos/logistica/transport/vehicles/store/vehicles.store'
import { useDocumentTypesStore } from '~/modulos/logistica/documents/transport-documents-types/document-types.store'
//form
import { vehicleFormFields } from '~/modulos/logistica/transport/vehicles/vehicleFormFields'
import ModalForm from '~/components/ModalForm.vue'
import { mapVehicleDocumentsToForm } from '~/modulos/logistica/transport/vehicles-combinations/mappers/mapVehicleDocumentsToForm'
//composables
import { useDocuments } from '~/modulos/logistica/documents/transport-documents-types/useDocuments'
//tabla columns
import { vehiclesColumns } from '~/modulos/logistica/transport/vehicles/vehicles.columns'
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput
} from '~/modulos/logistica/transport/vehicles/types/vehicles.types'

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import type { ButtonProps } from '@nuxt/ui'

type EditableField = 'plate'

type EditableValue = string | null | undefined
/* ---------------------------------------
   STATE
--------------------------------------- */
const loading = ref(true)
const documentStore = useDocumentTypesStore()
const store = useVehiclesStore()

const { items } = storeToRefs(store)
const { items: documentTypes } = storeToRefs(documentStore)

const { vehicleItems } = useDocuments(documentTypes)

/* ---------------------------------------
   MODAL CONTROL
--------------------------------------- */

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingRow = ref<any>(null)
const sorting = ref<SortingState>([])

function openCreate() {
  modalMode.value = 'create'
  editingRow.value = null
  modalOpen.value = true
}

function openEdit(row: Vehicle) {
  modalMode.value = 'edit'

  const documentFields = mapVehicleDocumentsToForm(row)

  console.log('ROW:', JSON.stringify(row, null, 2)) // ← agregar
  console.log('DOC FIELDS:', JSON.stringify(documentFields, null, 2)) // ← agregar

  editingRow.value = {
    ...row,
    ...documentFields
  }

  modalOpen.value = true
}
/* ---------------------------------------
   TABLE COLUMNS
--------------------------------------- */
function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

const columns = vehiclesColumns({
  onEdit: openEdit,
  onSortFieldSelect,
  onInlineSave: async (row: Vehicle, field: EditableField, value: EditableValue) => {
    const prev = row[field]
    row[field] = value ?? ''

    try {
      // Type assertion para el objeto dinámico
      const updateData = {
        [field]: value ?? undefined
      } as UpdateVehicleInput // ← Solución temporal

      await store.update(row.id, updateData)
    } catch {
      row[field] = prev
    }
  },
  onToggleActive: async (row, value) => {
    const prev = row.active
    row.active = value

    try {
      if (value) await store.activate(row.id)
      else await store.deactivate(row.id)
    } catch {
      row.active = prev
    }
  },
  onToggleRefrigeration: async (row, value) => {
    const prev = row.refrigeration
    row.refrigeration = value

    try {
      await store.update(row.id, { refrigeration: value })
    } catch {
      row.refrigeration = prev
    }
  },
  onToggleType(row, value) {
    const prev = row.type
    row.type = value

    try {
      store.update(row.id, { type: value })
    } catch {
      row.type = prev
    }
  }
})

// ========================================
// COMPUTED
// ========================================
const fields = computed(() =>
  vehicleFormFields.map((field) => {
    if (
      field.name === 'doc1Type' ||
      field.name === 'doc2Type' ||
      field.name === 'doc3Type' ||
      field.name === 'doc4Type'
    ) {
      return {
        ...field,
        options: vehicleItems.value,
        disabled: vehicleItems.value.length === 0
      }
    }

    return field
  })
)

// ========================================
// HOOKS
// ========================================

onMounted(async () => {
  await store.fetchAll()
  await documentStore.fetchAll()
  loading.value = store.loading
})
/* ---------------------------------------
   ACTIONS
--------------------------------------- */

async function handleSubmit(data: any) {
  if (modalMode.value === 'create') {
    const payload = mapCreateVehiclePayload(data)
    await store.create(payload)
  } else {
    const payload = mapUpdateVehiclePayload(data) // ya usa editingRow internamente
    // console.log('UPDATE PAYLOAD:', JSON.stringify(payload, null, 2))
    await store.update(editingRow.value!.id, payload)
  }

  await store.fetchAll()
  modalOpen.value = false
}

/* ---------------------------------------
   MAPPERS
--------------------------------------- */

function mapVehicleBase(form: any, existingRow?: any) {
  const documents: any[] = []

  for (let i = 1; i <= 4; i++) {
    const type = form[`doc${i}Type`]
    const expiration = form[`doc${i}Expiration`]
    const docId = existingRow?.[`doc${i}Id`] // ← leer del editingRow, no del form

    if (type) {
      documents.push({
        ...(docId && { id: docId }),
        documentTypeId: type,
        expirationDate: expiration || undefined
      })
    }
  }

  return {
    type: form.type,
    plate: form.plate,
    brand: form.brand,
    model: form.model,
    year: Number(form.year),
    maxWeight: Number(form.maxWeight),
    maxVolume: Number(form.maxVolume),
    refrigeration: form.refrigeration,
    documents
  }
}

function mapCreateVehiclePayload(form: any): CreateVehicleInput {
  return {
    ...mapVehicleBase(form)
  }
}

function mapUpdateVehiclePayload(form: any): UpdateVehicleInput {
  return mapVehicleBase(form, editingRow.value) // ← pasar editingRow
}
const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo Vehiculo',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])
const filterFields: FilterField[] = [
  {
    id: 'plate',
    label: 'Filtrar por patente...',
    class: 'w-40'
  },
  {
    id: 'vehicle',
    label: 'Filtrar por vehículo...',
    class: 'w-56'
  }
]

const sortFields: SortField[] = [
  {
    label: 'Patente',
    value: 'plate'
  },
  {
    label: 'Tipo',
    value: 'type'
  },
  {
    label: 'Vehículo',
    value: 'vehicle'
  },
  {
    label: 'Refrigeración',
    value: 'refrigeration'
  },
  {
    label: 'Estado',
    value: 'active'
  },
  {
    label: 'Fecha Creación',
    value: 'created_at'
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Vehiculos" description="Listado de Vehiculos" :links="links" />
    <LogisticaTable
      :loading="loading"
      :data="items"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
  <ModalForm
    v-model:open="modalOpen"
    :fields="fields"
    :title="modalMode === 'create' ? 'Nuevo Chofer' : 'Editar Chofer'"
    :initial-values="editingRow"
    @submit="handleSubmit"
  />
</template>
