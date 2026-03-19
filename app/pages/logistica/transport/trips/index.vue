<script setup lang="ts">
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
//stores
import { useTripsStore } from '~/modulos/logistica/transport/trips/trips.store'

//types
import type {
  Trip,
  CreateTripInput,
  UpdateTripInput
} from '~/modulos/logistica/transport/trips/types/trips.types'

//tabla columns
import { tripsColumns } from '~/modulos/logistica/transport/trips/columns'

type EditableField = 'reference_number' | 'kilometers'
type EditableValue = string | null | undefined
const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
import type { ButtonProps } from '@nuxt/ui'
function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}
const loading = ref(true)
const store = useTripsStore()
const { items } = storeToRefs(store)

/* ---------------------------------------
   MODAL CONTROL
--------------------------------------- */

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingRow = ref<any>(null)

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

const columns = tripsColumns({
  onEdit: openEdit,
  onInlineSave: async <K extends EditableField>(
    row: Trip,
    field: EditableField,
    value: EditableValue
  ) => {
    const prev = row[field]

    row[field] = value ?? prev

    try {
      const updateData: UpdateTripInput = {
        [field]: value ?? undefined
      }

      await store.update(row.id, updateData)
    } catch {
      row[field] = prev
    }
  },
  onToggleStatus: async (row, value) => {
    const prev = row.status
    row.status = value
    try {
      await store.updateStatus(row.id, value)
    } catch {
      row.status = prev
    }
  }
})

// ========================================
// ACTIONS
// ========================================

onMounted(async () => {
  const companyId = 'a060f7ff-0281-4df4-b5b3-cbdf940be31e'
  await store.fetchAll(companyId)

  loading.value = store.loading
})

async function handleSubmit(data: any) {
  const { id, rate_id, rate_value, status, ...rest } = data // extract status separately

  const basePayload = {
    ...rest,
    company_id: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e',
    kilometers: data.kilometers ? Number(data.kilometers) : undefined,
    departure_time: data.departure_time
      ? new Date(data.departure_time).toISOString()
      : undefined,
    arrival_time: data.arrival_time
      ? new Date(data.arrival_time).toISOString()
      : undefined
  }

  if (modalMode.value === 'create') {
    const payload: CreateTripInput = {
      ...basePayload,
      status // requerido en CreateTripInput
    }
    await store.create(payload)
  } else {
    const payload: UpdateTripInput = {
      ...basePayload,
      status // include status in the PATCH body (not via separate endpoint)
    }
    console.log(payload)
    await store.update(editingRow.value.id, payload)
  }

  await store.fetchAll('a060f7ff-0281-4df4-b5b3-cbdf940be31e')
  modalOpen.value = false
}

const links = ref<ButtonProps[]>([
  {
    label: 'Nuevo Viaje',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary',
    variant: 'solid'
  }
])
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
      <UPageHeader
        title="Viajes"
        description="Listado de Viajes"
        :links="links"
        class="mb-4 w-full"
      />
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </UPage>
</template>
