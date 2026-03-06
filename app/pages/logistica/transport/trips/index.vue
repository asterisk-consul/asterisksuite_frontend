<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
//stores
import { useTripsStore } from '~/stores/logistica/transport/trips.store'
import { useVehicleCombinationsStore } from '~/stores/logistica/transport/vehicle-combinations.store'
import { useLocationsStore } from '~/stores/logistica/meta-data/locations.store'
import { useTransferRatesStore } from '~/stores/logistica/transfer-rates/transfer-rates.store'
import { useAuthStore } from '~/stores/auth.store'
//form
import { tripsFormFields } from '~/form/tripFormFields'
import ModalForm from '~/components/ModalForm.vue'
//composables
import { useLocations } from '~/composables/logistica/useLocations'
import { useVehiclesCombinations } from '~/composables/logistica/useVehicleCombinations'
import { useTransferRate } from '~/composables/logistica/useTransferRate'
//tabla columns
import { columns } from './columns'

//page meta
definePageMeta({
  layout: 'logistica'
})

const loading = ref(true)
const open = ref(false)

const store = useTripsStore()
const vehiculoStore = useVehicleCombinationsStore()
const locationsStore = useLocationsStore()
const tableRenderers = useTransferRatesStore()
const authStore = useAuthStore()

const { items } = storeToRefs(store)
const { items: vehicleCombinations } = storeToRefs(vehiculoStore)
const { items: locations } = storeToRefs(locationsStore)
const { items: rates } = storeToRefs(tableRenderers)

const { items: combinationOptions } =
  useVehiclesCombinations(vehicleCombinations)

const { items: locationsItems } = useLocations(locations)

const { items: ratesItems } = useTransferRate(rates)

// ========================================
// COMPUTED
// ========================================

const fields = computed(() =>
  tripsFormFields.map((field) => {
    if (field.name === 'vehicle_combination_id') {
      return { ...field, options: combinationOptions.value }
    }
    if (field.name === 'origin_location_id') {
      return { ...field, options: locationsItems.value }
    }
    if (field.name === 'destination_location_id') {
      return { ...field, options: locationsItems.value }
    }
    if (field.name === 'rate_id') {
      return { ...field, options: ratesItems.value }
    }
    return field
  })
)

// ========================================
// ACTIONS
// ========================================

onMounted(async () => {
  const companyId = 'a060f7ff-0281-4df4-b5b3-cbdf940be31e'
  await store.fetchAll(companyId)
  await vehiculoStore.fetchAll(companyId)
  await locationsStore.fetchAll()
  await tableRenderers.fetchAll(companyId)
  loading.value = store.loading
})

function saveTrip(data: any) {
  const { id, rate_id, rate_value, ...rest } = data
  const payload = {
    ...rest,
    company_id: 'a060f7ff-0281-4df4-b5b3-cbdf940be31e',
    departure_time: new Date(data.departure_time).toISOString(), // ✅ "2026-03-06T00:00:00.000Z"
    arrival_time: new Date(data.arrival_time).toISOString() // ✅ "2026-03-07T00:00:00.000Z"
  }
  console.log(payload)
  store.create(payload)
  open.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h3>Viajes</h3>
      <UButton icon="i-heroicons-plus" @click="open = true">
        Nuevo Viaje
      </UButton>
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </div>
  <ModalForm
    v-model:open="open"
    :fields="fields"
    title="Nuevo Viaje"
    @submit="saveTrip"
  />
</template>
