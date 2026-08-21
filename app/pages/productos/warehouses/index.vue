<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

type EditableField = 'name' | 'code' | 'locationId'
type EditableValue = string | null | undefined

// stores
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'

// form
import { warehouseFormFields } from '~/modulos/logistica/warehouses/warehouse/warehouseFormFields'
import ModalForm from '~/components/ModalForm.vue'

// composables
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'

// types
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput
} from '~/modulos/logistica/warehouses/warehouse/warehouse.types'

// columns
import { createWarehouseColumns } from '~/modulos/logistica/warehouses/warehouse/columns'

// page meta
definePageMeta({ middleware: ['auth'] })

/* ---------------------------------------
   STATE
--------------------------------------- */

const loading = ref(true)

const store = useDepositosStore()
const locationsStore = useLocationsStore()
const unitsStore = useUnitsStore()

const { warehouses } = storeToRefs(store)
const { items: locations } = storeToRefs(locationsStore)
const { items: units } = storeToRefs(unitsStore)

const { items } = useLocations(locations)

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
    locationId: row.locationId ?? row.locations?.id ?? null,
    unitId: row.unitId ?? row.units?.id ?? null
  }
  modalOpen.value = true
}

/* ---------------------------------------
   TABLE COLUMNS
--------------------------------------- */

const columns = createWarehouseColumns({
  onEdit: openEdit,

  onToggleActive: async (row, value) => {
    const prev = row.active
    row.active = value

    try {
      if (value) await store.active(row.id)
      else await store.desactivate(row.id)
    } catch {
      row.active = prev
    }
  },

  onInlineSave: async (row, field: EditableField, value: EditableValue) => {
    const prev = row[field] as EditableValue
    row[field] = value ?? ''

    try {
      await store.updateWarehouse(row.id, { [field]: value })
    } catch {
      row[field] = prev ?? ''
    }
  }
})

/* ---------------------------------------
   FORM FIELDS
--------------------------------------- */

const unitOptions = computed(() =>
  units.value
    .filter((u) => u.active)
    .map((u) => ({
      label: `${u.name} (${u.symbol})`,
      value: u.id
    }))
)

const fields = computed(() =>
  warehouseFormFields.map((field) => {
    if (field.name === 'locationId') {
      return {
        ...field,
        options: items.value,
        disabled: items.value.length === 0
      }
    }
    if (field.name === 'unitId') {
      return {
        ...field,
        options: unitOptions.value,
        disabled: unitOptions.value.length === 0
      }
    }
    return field
  })
)

/* ---------------------------------------
   LIFECYCLE
--------------------------------------- */

onMounted(async () => {
  await store.fetchAll()

  if (locations.value.length === 0) {
    await locationsStore.fetchAll()
  }

  if (units.value.length === 0) {
    await unitsStore.fetchAll()
  }

  loading.value = store.loading
})

/* ---------------------------------------
   SUBMIT HANDLER
--------------------------------------- */

async function handleSubmit(data: any) {
  if (modalMode.value === 'create') {
    const payload: CreateWarehouseInput = {
      name: data.name,
      locationId: data.locationId,
      unitId: data.unitId,
      code: data.code,
      active: true
    }

    await store.createWarehouse(payload)
  } else {
    const payload: UpdateWarehouseInput = {
      name: data.name,
      locationId: data.locationId,
      unitId: data.unitId,
      code: data.code,
      active: data.active
    }

    await store.updateWarehouse(editingRow.value.id, payload)
  }

  await store.fetchAll()

  modalOpen.value = false
}
const links = ref([
  {
    label: 'Nuevo Depósito',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary' as const,
    variant: 'solid' as const
  }
])
</script>

<template>
  <UPage class="space-y-4">
    <UPageHeader
      title="Depósitos"
      description="Listado de depósitos"
      :links="links"
      class="mb-4 w-full"
    />

    <LogisticaTable :loading="loading" :data="warehouses" :columns="columns" />
  </UPage>

  <ModalForm
    v-model:open="modalOpen"
    :fields="fields"
    :title="modalMode === 'create' ? 'Nuevo Depósito' : 'Editar Depósito'"
    :initial-values="editingRow"
    @submit="handleSubmit"
  />
</template>
