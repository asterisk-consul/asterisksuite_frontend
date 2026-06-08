<script setup lang="ts">
const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
import type { CreateDriverInput, UpdateDriverInput } from '~/modulos/logistica/transport/drivers/drivers.types'
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

import { useDocumentTypesStore } from '~/modulos/logistica/documents/transport-documents-types/document-types.store'
import { useChoferesStore } from '~/modulos/logistica/transport/drivers/choferes.store'
//composable
import { mapDriverDocumentsToForm } from '~/modulos/logistica/transport/drivers/mappers/mapDriverDocumentsToForm'
import { useDocuments } from '~/modulos/logistica/documents/transport-documents-types/useDocuments'
import { useDriverMetrics } from '~/modulos/logistica/transport/drivers/useDriverMetrics'
import type { Driver } from '~/modulos/logistica/transport/drivers/drivers.types'
//form
import { driverFormFields } from '~/modulos/logistica/transport/drivers/driverFormFields'
import ModalForm from '~/components/ModalForm.vue'
//tabla
import { driversColumns } from '~/modulos/logistica/transport/drivers/columns'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}

const loading = ref(true)
const store = useChoferesStore()
const documentStore = useDocumentTypesStore()
const { drivers } = storeToRefs(store)
const { items: documentTypes } = storeToRefs(documentStore)

const { driverItems } = useDocuments(documentTypes)
const metrics = useDriverMetrics(drivers)

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

function openEdit(row: Driver) {
  modalMode.value = 'edit'

  editingRow.value = {
    ...row,
    ...mapDriverDocumentsToForm(row)
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

const columns = driversColumns({
  onEdit: openEdit,
  onSortFieldSelect,
  onToggleActive: async (row, value) => {
    const prev = row.active
    row.active = value

    try {
      if (value) await store.activate(row.id)
      else await store.desactivate(row.id)
    } catch {
      row.active = prev
    }
  }
})

/* ---------------------------------------
   LIFECYCLE
--------------------------------------- */

onMounted(async () => {
  await store.fetchAll()
  await documentStore.fetchAll()
  loading.value = store.loading
})

const fields = computed(() =>
  driverFormFields.map((field) => {
    if (
      field.name === 'doc1Type' ||
      field.name === 'doc2Type' ||
      field.name === 'doc3Type' ||
      field.name === 'doc4Type'
    ) {
      return {
        ...field,
        options: driverItems.value,
        disabled: driverItems.value.length === 0
      }
    }

    return field
  })
)

async function handleSubmit(data: any) {
  if (modalMode.value === 'create') {
    const payload: CreateDriverInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      document: data.document,
      phone: data.phone,
      active: data.active,
      documents: buildDriverDocuments(data)
    }

    await store.create(payload)
  } else {
    console.log(data)
    const payload: UpdateDriverInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      document: data.document,
      phone: data.phone,
      active: data.active,
      documents: buildDriverDocuments(data)
    }

    await store.update(editingRow.value.id, payload)
  }

  await store.fetchAll() // 🔥 FALTA ESTO

  modalOpen.value = false
}
function buildDriverDocuments(form: any) {
  const docs = []

  for (let i = 1; i <= 4; i++) {
    const type = form[`doc${i}Type`]
    const expiration = form[`doc${i}Expiration`]

    if (type) {
      docs.push({
        document_type_id: type,
        expiration_date: expiration || null
      })
    }
  }

  return docs
}
const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo  Chofer',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])

const filterFields: FilterField[] = [
  {
    id: 'driver',
    label: 'Filtrar por chofer...',
    class: 'w-56'
  },
  {
    id: 'document',
    label: 'Filtrar por documento...',
    class: 'w-40'
  },
  {
    id: 'phone',
    label: 'Filtrar por teléfono...',
    class: 'w-40'
  }
]

const sortFields: SortField[] = [
  {
    label: 'Chofer',
    value: 'driver'
  },
  {
    label: 'Documento',
    value: 'document'
  },
  {
    label: 'Teléfono',
    value: 'phone'
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
    <div class="flex flex-col">
      <div>
        <UButton
          icon="i-lucide-layout-panel-left"
          variant="ghost"
          color="neutral"
          label="Menu"
          @click="toggleModuleSidebar"
        />
      </div>
      <UPageHeader title="Choferes" description="Listado de Choferes" :links="links" class="mb-4 w-full" />
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Total Choferes</p>
          <p class="text-2xl font-bold">{{ metrics.total }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Activos</p>
          <p class="text-2xl font-bold text-green-600">
            {{ metrics.active }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-xs text-gray-500">Inactivos</p>
          <p class="text-2xl font-bold text-gray-500">
            {{ metrics.inactive }}
          </p>
        </div>
      </UCard>
    </div>
    <LogisticaTable
      :loading="loading"
      :data="drivers"
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
