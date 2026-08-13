<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import { useDocumentTypesStore } from '~/modulos/logistica/documents/transport-documents-types/document-types.store'
import { documentTypeFormFields } from '~/modulos/logistica/documents/transport-documents-types/documentTypeFormFields'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

import type {
  CreateDocumentTypeInput,
  UpdateDocumentTypeInput
} from '~/modulos/logistica/documents/transport-documents-types/document-types.types'

type EditableField = 'name'
type EditableValue = string | null | undefined

import ModalForm from '~/components/ModalForm.vue'
import { transportDocumentTypeColumns } from '~/modulos/logistica/documents/transport-documents-types/columns'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import type { ButtonProps } from '@nuxt/ui'

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

function openEdit(row: any) {
  modalMode.value = 'edit'

  editingRow.value = {
    ...row,
    locationId: row.locationId ?? row.locations?.id ?? null
  }
  modalOpen.value = true
}

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

const columns = transportDocumentTypeColumns({
  onEdit: openEdit,
  onSortFieldSelect,
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
  onToggleEntity: async (row, value) => {
    row.entity = value
    console.log(value)
    try {
      await store.update(row.id, { entity: value })
    } catch {
      row.entity = !value ? 'VEHICLE' : 'DRIVER'
    }
  },
  onInlineSave: async (row, field: EditableField, value: EditableValue) => {
    const prev = row[field] as EditableValue
    row[field] = value ?? ''

    try {
      const normalized = value ?? undefined

      await store.update(row.id, {
        [field]: normalized
      })
    } catch {
      row[field] = prev ?? ''
    }
  }
})

const loading = ref(true)
const store = useDocumentTypesStore()
const { items } = storeToRefs(store)

/* ---------------------------------------
   LIFECYCLE
--------------------------------------- */

onMounted(async () => {
  await store.fetchAll()
  loading.value = store.loading
})

/* ---------------------------------------
   SUBMIT HANDLER
--------------------------------------- */

async function handleSubmit(data: any) {
  if (modalMode.value === 'create') {
    const { id, ...payload } = data

    await store.create(payload)
  } else {
    console.log(data)
    const payload: UpdateDocumentTypeInput = {
      name: data.name,
      entity: data.entity
    }

    await store.update(editingRow.value.id, payload)
  }

  await store.fetchAll() // 🔥 FALTA ESTO

  modalOpen.value = false
}
const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo Documento de Transporte',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])

const filterFields: FilterField[] = [{ id: 'name', label: 'Filtrar por nombre...', class: 'w-56' }]

const sortFields: SortField[] = [
  { label: 'Nombre', value: 'name' },
  { label: 'Entidad', value: 'entity' },
  { label: 'Fecha Creación', value: 'created_at' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Documentos de Transporte" description="Listado de Documentos de Transporte" :links="links" />
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
    :fields="documentTypeFormFields"
    :title="modalMode === 'create' ? 'Nuevo Documento' : 'Editar Documento'"
    :initial-values="editingRow"
    @submit="handleSubmit"
  />
</template>
