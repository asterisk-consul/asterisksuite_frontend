<script setup lang="ts">
// --- IMPORTS ---
// --- TIPOS ---
import type { PartyContact } from '~/modulos/logistica/master-data/contacts/types/contacts.types'
import type { ButtonProps } from '@nuxt/ui'

type EditableField = 'first_name' | 'last_name' | 'role' | 'phone' | 'email'

type EditableValue = string | null | undefined
// --- Configuración de Pages --
definePageMeta({ middleware: ['auth'] })
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
// --- STORES ---
import { usePartyContactsStore } from '~/modulos/logistica/master-data/contacts/store/contacts.store'
import { PartyContactColumns } from '~/modulos/logistica/master-data/contacts/contacts.columns'
// --- COMPONENTS ---s
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useTableDelete } from '~/composables/table/useTableDelete'

function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}

/* ---------------------------------------
   STATE
--------------------------------------- */
const store = usePartyContactsStore()
const router = useRouter()
const { contacts } = storeToRefs(store)
const loading = ref(true)
const sorting = ref<SortingState>([])

/* ---------------------------------------
   MODAL CONTROL
--------------------------------------- */

function openCreate() {
  router.push('/logistica/business-parties/contacts/create')
}

function openEdit(row: any) {
  router.push(`/logistica/business-parties/contacts/${row.id}/edit`)
}

/* ---------------------------------------
   DELETE
--------------------------------------- */

const { deleteOne, deleteMany } = useTableDelete('party_contacts')

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

const columns = PartyContactColumns({
  onEdit: openEdit,
  onSortFieldSelect,
  onDelete: handleDeleteOne,
  onInlineSave: async (row: PartyContact, field: EditableField, value: EditableValue) => {
    const prev = row[field] ?? ''
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
  loading.value = store.loading
})

const links: ButtonProps[] = [
  {
    label: 'Nuevo Contacto',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]

const filterFields: FilterField[] = [
  { id: 'name', label: 'Filtrar por nombre...', class: 'w-56' },
  { id: 'last_name', label: 'Filtrar por apellido...' },
  { id: 'email', label: 'Filtrar por correo...' },
  { id: 'phone', label: 'Filtrar por telefono...' },
  { id: 'role', label: 'Filtrar por rol...' }
]

const sortFields: SortField[] = [
  { label: 'Nombre', value: 'first_name' },
  { label: 'Apellido', value: 'last_name' },
  { label: 'Rol', value: 'Rol' },
  { label: 'Telefono', value: 'Teléfono' },
  { label: 'Correo', value: 'email' },
  { label: 'Fecha Creación', value: 'created_at' }
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
      <UPageHeader title="Contactos" description="Listado de Contactos" :links="links" class="mb-4 w-full" />
    </div>

    <LogisticaTable
      :loading="loading"
      :data="contacts"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
      :on-delete="handleBulkDelete"
    />
  </UPage>
</template>
