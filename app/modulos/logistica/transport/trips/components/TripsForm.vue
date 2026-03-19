<script setup lang="ts">
import type {
  Trip,
  CreateTripInput
} from '~/modulos/logistica/transport/trips/types/trips.types'

import {
  mapTripToForm,
  mapFormToDto,
  statusOptions,
  type TripForm
} from '~/modulos/logistica/transport/trips/mappers/trips.mapper'

import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { useBusinessParties } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessParties'

const props = defineProps<{
  trip?: Trip
  companyId: string
}>()

const emit = defineEmits<{
  submit: [trip: CreateTripInput]
  cancel: []
}>()

const isEdit = computed(() => !!props.trip)

/**
 * STORE
 */
const businessPartiesStore = useBusinessPartiesStore()
const { items: businessParties } = storeToRefs(businessPartiesStore)
const { items } = useBusinessParties(businessParties)

/**
 * FORM
 */
const form = reactive<TripForm>({
  company_id: props.companyId,
  reference_number: '',
  vehicle_combination_id: undefined,
  origin_location_id: undefined,
  destination_location_id: undefined,
  corridor_id: undefined,
  route: undefined,
  departure_time: undefined,
  arrival_time: undefined,
  status: 'PLANNED',
  statusOption: statusOptions[0],
  kilometers: undefined,
  business_party_id: undefined,
  business_party: undefined
})

/**
 * Sync edit
 */
watch(
  [items, () => props.trip],
  () => {
    if (!items.value.length) return

    if (props.trip) {
      Object.assign(form, mapTripToForm(props.trip, items.value))
    }
  },
  { immediate: true }
)

/**
 * Submit
 */
const submit = () => {
  emit('submit', mapFormToDto(form))
}

/**
 * Fetch
 */
onMounted(async () => {
  await businessPartiesStore.fetchAll(props.companyId)
})
</script>

<template>
  <UForm @submit="submit" class="space-y-6">
    <UCard :ui="{ body: 'grid grid-cols-3 gap-4' }">
      <!-- Referencia -->
      <UFormField label="Referencia">
        <UInput v-model="form.reference_number" />
      </UFormField>

      <!-- Cliente -->
      <UFormField label="Cliente">
        <USelectMenu
          v-model="form.business_party"
          :items="items"
          option-attribute="label"
          value-attribute="value"
          placeholder="Seleccionar cliente"
        />
      </UFormField>

      <!-- Estado -->
      <UFormField label="Estado">
        <USelectMenu
          v-model="form.statusOption"
          :items="statusOptions"
          option-attribute="label"
          value-attribute="value"
          placeholder="Seleccionar estado"
        />
      </UFormField>

      <!-- Fechas -->
      <UFormField label="Salida">
        <UInput type="datetime-local" v-model="form.departure_time" />
      </UFormField>

      <UFormField label="Llegada">
        <UInput type="datetime-local" v-model="form.arrival_time" />
      </UFormField>

      <!-- Km -->
      <UFormField label="Kilómetros">
        <UInput type="number" v-model="form.kilometers" />
      </UFormField>

      <!-- Origen -->
      <UFormField label="Origen">
        <UInput v-model="form.origin_location_id" />
      </UFormField>

      <!-- Destino -->
      <UFormField label="Destino">
        <UInput v-model="form.destination_location_id" />
      </UFormField>
    </UCard>

    <!-- ACTIONS -->
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" @click="emit('cancel')">Cancelar</UButton>

      <UButton type="submit">
        {{ isEdit ? 'Guardar cambios' : 'Crear viaje' }}
      </UButton>
    </div>
  </UForm>
</template>
