<script setup lang="ts">
import { computed } from 'vue'
import LocationSelect from '~/components/international-operations/LocationSelect.vue'
import { useIntlOpsSettingsStore } from '~/modulos/international-operations/store/intl-ops-settings.store'
import type { CreateContainerInput, ContainerType } from '~/modulos/international-operations/types/international-operations.types'
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

const model = defineModel<CreateContainerInput>({ required: true })
const settingsStore = useIntlOpsSettingsStore()

const containerTypes: { label: string; value: ContainerType }[] = [
  { label: "20' Dry Van", value: 'TWENTY_DV' },
  { label: "40' Dry Van", value: 'FORTY_DV' },
  { label: "40' High Cube", value: 'FORTY_HC' },
  { label: "45' High Cube", value: 'FORTY_FIVE_HC' },
  { label: 'Otro', value: 'OTHER' }
]

const advancedFields = [
  'seal_number', 'booking_number', 'bill_of_lading', 'vessel_name',
  'voyage_number', 'weight', 'volume', 'notes'
]

const hasAdvancedFields = computed(() => advancedFields.some(field => settingsStore.isContainerFieldVisible(field)))

const portLabel = (location: Location | null) => location
  ? (location.address ? `${location.address} - ${location.city ?? ''}` : location.city ?? '')
  : ''

const handleOriginPortSelect = (location: Location | null) => {
  model.value = { ...model.value, origin_port: portLabel(location) }
}

const handleDestinationPortSelect = (location: Location | null) => {
  model.value = { ...model.value, destination_port: portLabel(location) }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Descripción" name="initial_container.description" class="sm:col-span-2">
        <UInput v-model="model.description" maxlength="255" placeholder="Contenedor N°1 - " class="w-full" />
      </UFormField>

      <UFormField label="Número de contenedor" name="initial_container.container_number" required>
        <UInput v-model="model.container_number" required placeholder="MSCU1234567" class="w-full" />
      </UFormField>

      <UFormField v-if="settingsStore.isContainerFieldVisible('container_type')" label="Tipo de contenedor" name="initial_container.container_type">
        <USelect v-model="model.container_type" :items="containerTypes" class="w-full" />
      </UFormField>

      <UFormField v-if="settingsStore.isContainerFieldVisible('origin_port')" label="Puerto de origen" name="initial_container.origin_port_id">
        <LocationSelect
          v-model="model.origin_port_id"
          placeholder="Seleccionar puerto de origen"
          @select="handleOriginPortSelect"
        />
      </UFormField>

      <UFormField v-if="settingsStore.isContainerFieldVisible('destination_port')" label="Puerto de destino" name="initial_container.destination_port_id">
        <LocationSelect
          v-model="model.destination_port_id"
          placeholder="Seleccionar puerto de destino"
          @select="handleDestinationPortSelect"
        />
      </UFormField>

      <UFormField v-if="settingsStore.isContainerFieldVisible('estimated_departure_date')" label="Salida estimada" name="initial_container.estimated_departure_date">
        <UInput v-model="model.estimated_departure_date" type="date" class="w-full" />
      </UFormField>

      <UFormField v-if="settingsStore.isContainerFieldVisible('estimated_arrival_date')" label="Arribo estimado" name="initial_container.estimated_arrival_date">
        <UInput v-model="model.estimated_arrival_date" type="date" class="w-full" />
      </UFormField>
    </div>

    <details v-if="hasAdvancedFields" class="group rounded-lg border border-default bg-muted/10">
      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium">
        <span class="flex items-center gap-2">
          <UIcon name="i-lucide-list-plus" class="size-4 text-primary" />
          Más datos del contenedor
        </span>
        <UIcon name="i-lucide-chevron-down" class="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div class="grid gap-4 border-t border-default p-3 sm:grid-cols-2">
        <UFormField v-if="settingsStore.isContainerFieldVisible('seal_number')" label="Número de sello" name="initial_container.seal_number">
          <UInput v-model="model.seal_number" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('booking_number')" label="Booking" name="initial_container.booking_number">
          <UInput v-model="model.booking_number" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('bill_of_lading')" label="Bill of Lading" name="initial_container.bill_of_lading">
          <UInput v-model="model.bill_of_lading" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('vessel_name')" label="Buque" name="initial_container.vessel_name">
          <UInput v-model="model.vessel_name" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('voyage_number')" label="Número de viaje" name="initial_container.voyage_number">
          <UInput v-model="model.voyage_number" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('weight')" label="Peso (kg)" name="initial_container.weight">
          <UInput v-model="model.weight" type="number" min="0" step="0.001" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('volume')" label="Volumen (m³)" name="initial_container.volume">
          <UInput v-model="model.volume" type="number" min="0" step="0.001" class="w-full" />
        </UFormField>
        <UFormField v-if="settingsStore.isContainerFieldVisible('notes')" label="Notas" name="initial_container.notes" class="sm:col-span-2">
          <UTextarea v-model="model.notes" :rows="2" class="w-full" />
        </UFormField>
      </div>
    </details>
  </div>
</template>
