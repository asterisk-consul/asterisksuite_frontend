<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'
import type {
  CreateContainerInput,
  ContainerType
} from '~/modulos/international-operations/types/international-operations.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CreateContainerInput>
    loading?: boolean
    submitLabel?: string
    cancelTo?: string
  }>(),
  {
    initialData: () => ({}),
    loading: false,
    submitLabel: 'Crear contenedor',
    cancelTo: '/operaciones-internacionales'
  }
)

const emit = defineEmits<{
  submit: [payload: CreateContainerInput]
}>()

const locationsStore = useLocationsStore()
const { items: locations } = storeToRefs(locationsStore)
const { items: locationItems } = useLocations(locations)

onMounted(() => { locationsStore.fetchAll() })

const form = ref<CreateContainerInput>({
  container_number: '',
  container_type: 'TWENTY_DV',
  seal_number: '',
  booking_number: '',
  bill_of_lading: '',
  vessel_name: '',
  voyage_number: '',
  origin_port: '',
  origin_port_id: undefined,
  destination_port: '',
  destination_port_id: undefined,
  estimated_departure_date: '',
  estimated_arrival_date: '',
  weight: '',
  volume: '',
  notes: '',
  ...props.initialData
})

const containerTypes: { label: string; value: ContainerType }[] = [
  { label: '20\' Dry Van (Estándar)', value: 'TWENTY_DV' },
  { label: '40\' Dry Van (Estándar)', value: 'FORTY_DV' },
  { label: '40\' High Cube (Alto)', value: 'FORTY_HC' },
  { label: '45\' High Cube (Alto)', value: 'FORTY_FIVE_HC' },
  { label: 'Otro', value: 'OTHER' }
]

const containerTypeDescriptions = [
  {
    code: '20\' Dry Van',
    desc: 'Contenedor estándar de 20 pies. Ideal para mercadería general, cajas, palets.',
    capacity: '~33 m³',
    dims: '6.1m × 2.4m × 2.6m'
  },
  {
    code: '40\' Dry Van',
    desc: 'Contenedor estándar de 40 pies. El más usado en comercio internacional.',
    capacity: '~67 m³',
    dims: '12.2m × 2.4m × 2.6m'
  },
  {
    code: '40\' High Cube',
    desc: 'Igual que el 40\' estándar pero con 30cm más de alto. Para cargas voluminosas.',
    capacity: '~76 m³',
    dims: '12.2m × 2.4m × 2.9m'
  },
  {
    code: '45\' High Cube',
    desc: 'El más largo. Para cargas que requieren máximo volumen.',
    capacity: '~86 m³',
    dims: '13.7m × 2.4m × 2.9m'
  }
]

const selectedOriginPort = computed({
  get: () => locationItems.value.find((l) => l.value === form.value.origin_port_id) ?? null,
  set: (item: any) => {
    if (item) {
      form.value.origin_port_id = item.value
      form.value.origin_port = item.label
    } else {
      form.value.origin_port_id = undefined
      form.value.origin_port = ''
    }
  }
})

const selectedDestinationPort = computed({
  get: () => locationItems.value.find((l) => l.value === form.value.destination_port_id) ?? null,
  set: (item: any) => {
    if (item) {
      form.value.destination_port_id = item.value
      form.value.destination_port = item.label
    } else {
      form.value.destination_port_id = undefined
      form.value.destination_port = ''
    }
  }
})

const onSubmit = () => {
  emit('submit', { ...form.value })
}
</script>

<template>
  <UForm :state="form" @submit="onSubmit" class="space-y-6">
    <UPageCard>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Número de contenedor" name="container_number" required>
          <UInput v-model="form.container_number" placeholder="MSCU1234567" class="w-full" />
        </UFormField>

        <UFormField label="Tipo" name="container_type">
          <div class="flex items-center gap-2">
            <USelect v-model="form.container_type" :items="containerTypes" class="flex-1" />
            <UPopover>
              <UIcon name="i-lucide-help-circle" class="h-5 w-5 text-muted shrink-0 cursor-help hover:text-default transition-colors" />
              <template #content>
                <div class="p-4 max-h-96 overflow-y-auto w-80 space-y-3">
                  <p class="text-xs font-semibold text-muted uppercase tracking-wide">Tipos de contenedor</p>
                  <div v-for="ct in containerTypeDescriptions" :key="ct.code" class="space-y-1 border-b border-default pb-2 last:border-0">
                    <p class="font-medium text-sm">{{ ct.code }}</p>
                    <p class="text-xs text-muted">{{ ct.desc }}</p>
                    <p class="text-xs">Capacidad: {{ ct.capacity }} — {{ ct.dims }}</p>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </UFormField>

        <UFormField label="Número de sello" name="seal_number">
          <UInput v-model="form.seal_number" class="w-full" />
        </UFormField>

        <UFormField label="Booking" name="booking_number">
          <UInput v-model="form.booking_number" class="w-full" />
        </UFormField>

        <UFormField label="Bill of Lading" name="bill_of_lading">
          <UInput v-model="form.bill_of_lading" class="w-full" />
        </UFormField>

        <UFormField label="Buque" name="vessel_name">
          <UInput v-model="form.vessel_name" class="w-full" />
        </UFormField>

        <UFormField label="Número de viaje" name="voyage_number">
          <UInput v-model="form.voyage_number" class="w-full" />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard title="Puertos">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Puerto de origen" name="origin_port_id">
          <USelectMenu
            v-model="selectedOriginPort"
            :items="locationItems"
            placeholder="Seleccionar puerto de origen"
            searchable
            clear
            class="w-full"
          />
        </UFormField>
        <UFormField label="Puerto de destino" name="destination_port_id">
          <USelectMenu
            v-model="selectedDestinationPort"
            :items="locationItems"
            placeholder="Seleccionar puerto de destino"
            searchable
            clear
            class="w-full"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard title="Fechas y Dimensiones">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Salida estimada" name="estimated_departure_date">
          <UInput v-model="form.estimated_departure_date" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Arribo estimado" name="estimated_arrival_date">
          <UInput v-model="form.estimated_arrival_date" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Peso (kg)" name="weight">
          <UInput v-model="form.weight" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Volumen (m³)" name="volume">
          <UInput v-model="form.volume" type="number" class="w-full" />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard title="Notas">
      <UFormField name="notes">
        <UTextarea v-model="form.notes" class="w-full" :rows="2" />
      </UFormField>
    </UPageCard>

    <div class="flex justify-end gap-2">
      <UButton label="Cancelar" variant="ghost" :to="cancelTo" />
      <UButton :label="submitLabel" color="primary" type="submit" :loading="loading" />
    </div>
  </UForm>
</template>
