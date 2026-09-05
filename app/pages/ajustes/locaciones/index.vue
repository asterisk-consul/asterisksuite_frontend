<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { LocationColumns } from '~/modulos/logistica/master-data/locations/columns'
import { locationFormFields } from '~/modulos/logistica/master-data/locations/locationsFormFields'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useTableDelete } from '~/composables/table/useTableDelete'

const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'
function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}
const store = useLocationsStore()

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

/* ---------------------------------------
   TIPOS
--------------------------------------- */

import type {
  CreateLocationInput,
  UpdateLocationInput,
  Location
} from '~/modulos/logistica/master-data/locations/types/locations.types'

type EditableField = 'city' | 'province' | 'country' | 'postalCode'

type EditableValue = string | null | undefined
/* ---------------------------------------
   STATE
--------------------------------------- */
const { items } = storeToRefs(store)
const loading = ref(true)

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

/* ---------------------------------------
   DELETE
--------------------------------------- */

const { deleteOne, deleteMany } = useTableDelete('locations')

async function handleDeleteOne(row: any) {
  await deleteOne(row.id)
  await store.fetchAll()
}

async function handleBulkDelete(rows: any[]) {
  await deleteMany(rows.map(r => r.id))
  await store.fetchAll()
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

const columns = LocationColumns({
  onEdit: openEdit,
  onSortFieldSelect,
  onDelete: handleDeleteOne,
  onInlineSave: async (row: Location, field: EditableField, value: EditableValue) => {
    const prev = row[field]
    row[field] = value ?? ''

    try {
      await store.update(row.id, {
        [field]: value ?? undefined
      })
    } catch {
      row[field] = prev
    }
  }
})

/* ---------------------------------------
   LIFECYCLE
--------------------------------------- */
onMounted(async () => {
  await store.fetchAll()
  console.log(items)
  loading.value = store.loading
})

/* ---------------------------------------
   SUBMIT HANDLER
--------------------------------------- */

async function handleSubmit(data: any) {
  if (modalMode.value === 'create') {
    const payload: CreateLocationInput = {
      city: data.city,
      province: data.province,
      country: data.country,
      postalCode: data.postal_code
    }

    await store.create(payload)
  } else {
    const payload: UpdateLocationInput = {
      city: data.city,
      province: data.province,
      country: data.country,
      postalCode: data.postal_code
    }

    await store.update(editingRow.value.id, payload)
  }

  await store.fetchAll() // 🔥 FALTA ESTO

  modalOpen.value = false
}
const links: ButtonProps[] = [
  {
    label: 'Nueva Locacion',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]
const filterFields: FilterField[] = [
  {
    id: 'city',
    label: 'Filtrar por ciudad...',
    class: 'w-40'
  },
  {
    id: 'province',
    label: 'Filtrar por provincia...',
    class: 'w-40'
  },
  {
    id: 'country',
    label: 'Filtrar por país...',
    class: 'w-40'
  }
]

const sortFields: SortField[] = [
  {
    label: 'Dirección',
    value: 'address'
  },
  {
    label: 'Ciudad',
    value: 'city'
  },
  {
    label: 'Provincia',
    value: 'province'
  },
  {
    label: 'País',
    value: 'country'
  },
  {
    label: 'Código Postal',
    value: 'postalCode'
  },
  {
    label: 'Coordenadas',
    value: 'coordinates'
  },
  {
    label: 'Fecha Creación',
    value: 'created_at'
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Locaciones" description="Listado de Locaciones" :links="links" />

    <LogisticaTable
      :loading="loading"
      :data="items"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
      :on-delete="handleBulkDelete"
    />
  </UPage>

  <ModalForm
    v-model:open="modalOpen"
    :fields="locationFormFields"
    :title="modalMode === 'create' ? 'Nueva Locación' : 'Editar Locación'"
    :initial-values="editingRow"
    @submit="handleSubmit"
  />
</template>
