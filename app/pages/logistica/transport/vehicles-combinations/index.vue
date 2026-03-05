<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
//stores
import { useVehiclesStore } from '~/stores/logistica/transport/vehicles.store'
import { useVehicleCombinationsStore } from '~/stores/logistica/transport/vehicle-combinations.store'
import { useAuthStore } from '~/stores/auth.store'
//form
import { vehicleCombinationFields } from '~/form/vehicleCombinationsForm'
import ModalForm from '~/components/ModalForm.vue'
//composables
import { useVehicles } from '~/composables/logistica/useVehicles'
//tabla columns
import { columns } from './columns'

//page meta
definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const open = ref(false)

const store = useVehicleCombinationsStore()
const vehiculoStore = useVehiclesStore()
const authStore = useAuthStore()

const { items } = storeToRefs(store)
const { items: vehicles } = storeToRefs(vehiculoStore)

const { tractorOptions, trailerOptions } = useVehicles(vehicles)

// ========================================
// COMPUTED
// ========================================

const fields = computed(() =>
  vehicleCombinationFields.map((field) => {
    if (field.name === 'tractorId') {
      return { ...field, options: tractorOptions.value }
    }
    if (field.name === 'trailerId') {
      return { ...field, options: trailerOptions.value }
    }
    return field
  })
)

// ========================================
// HOOKS
// ========================================

onMounted(async () => {
  await store.fetchAll('a060f7ff-0281-4df4-b5b3-cbdf940be31e')
  await vehiculoStore.fetchAll('a060f7ff-0281-4df4-b5b3-cbdf940be31e')
  await authStore.fetchMe()
  loading.value = store.loading
})

// ========================================
// ACTIONS
// ========================================

function saveDriver(data: any) {
  const payload = {
    ...data,
    companyId: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e', // override al final
    createdBy: authStore.user?.id
  }
  store.create(payload)
  open.value = false
}
// ========================================
// MAP PAYLOAD
// ========================================
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Vehiculos</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Vehiculo
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="fields"
    title="Nuevo Chofer"
    @submit="saveDriver"
  />
</template>
