<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type { ContainerEvent, ContainerEventType } from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const containerId = route.params.containerId as string

const {
  findOneContainer,
  createEvent,
  removeEvent,
  containerStatusColor,
  containerStatusLabel,
  formatCurrency,
  formatDate
} = useInternationalOperations()

const container = ref<any>(null)
const loading = ref(true)

const showEventForm = ref(false)
const eventForm = ref<CreateEventInput>({
  event_type: 'LOADED_AT_ORIGIN' as ContainerEventType,
  event_date: new Date().toISOString().split('T')[0],
  location_text: '',
  description: ''
})

const eventTypes: { label: string; value: ContainerEventType }[] = [
  { label: 'Cargado en origen', value: 'LOADED_AT_ORIGIN' },
  { label: 'Partió de origen', value: 'DEPARTED_ORIGIN' },
  { label: 'Embarcado', value: 'SHIPPED' },
  { label: 'En tránsito', value: 'IN_TRANSIT' },
  { label: 'Arribó al puerto', value: 'ARRIVED_AT_PORT' },
  { label: 'Aduana', value: 'CUSTOMS' },
  { label: 'Liberado', value: 'RELEASED' },
  { label: 'Transporte interno', value: 'INLAND_TRANSPORT' },
  { label: 'Arribó al depósito', value: 'ARRIVED_AT_WAREHOUSE' },
  { label: 'Entregado', value: 'DELIVERED' }
]

onMounted(async () => {
  try {
    container.value = await findOneContainer(containerId)
  } finally {
    loading.value = false
  }
})

const handleCreateEvent = async () => {
  await createEvent(containerId, eventForm.value)
  container.value = await findOneContainer(containerId)
  showEventForm.value = false
  eventForm.value = {
    event_type: 'LOADED_AT_ORIGIN' as ContainerEventType,
    event_date: new Date().toISOString().split('T')[0],
    location_text: '',
    description: ''
  }
}

const handleRemoveEvent = async (eventId: string) => {
  if (confirm('¿Eliminar este evento?')) {
    await removeEvent(eventId)
    container.value = await findOneContainer(containerId)
  }
}
</script>

<template>
  <UPage class="space-y-6">
    <AppPageHeader v-if="container" :title="container.container_number" :description="`Contenedor — ${container.operation?.number ?? ''}`">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" :to="`/operaciones-internacionales/${container.operation?.id}`" />
      </template>
    </AppPageHeader>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-48 w-full" />
    </div>

    <template v-if="container">
      <div class="flex flex-wrap gap-2 items-center">
        <UBadge :label="containerStatusLabel(container.status)" :color="containerStatusColor(container.status)" size="lg" />
        <span class="text-muted text-sm" v-if="container.container_type">{{ container.container_type }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UPageCard title="Información del Contenedor">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-muted">Número</p>
              <p class="font-medium">{{ container.container_number }}</p>
            </div>
            <div>
              <p class="text-muted">Tipo</p>
              <p class="font-medium">{{ container.container_type }}</p>
            </div>
            <div v-if="container.seal_number">
              <p class="text-muted">Sello</p>
              <p class="font-medium">{{ container.seal_number }}</p>
            </div>
            <div v-if="container.booking_number">
              <p class="text-muted">Booking</p>
              <p class="font-medium">{{ container.booking_number }}</p>
            </div>
            <div v-if="container.bill_of_lading">
              <p class="text-muted">Bill of Lading</p>
              <p class="font-medium">{{ container.bill_of_lading }}</p>
            </div>
            <div v-if="container.vessel_name">
              <p class="text-muted">Buque</p>
              <p class="font-medium">{{ container.vessel_name }}</p>
            </div>
            <div v-if="container.voyage_number">
              <p class="text-muted">Viaje</p>
              <p class="font-medium">{{ container.voyage_number }}</p>
            </div>
            <div v-if="container.weight">
              <p class="text-muted">Peso</p>
              <p class="font-medium">{{ container.weight }} kg</p>
            </div>
            <div v-if="container.volume">
              <p class="text-muted">Volumen</p>
              <p class="font-medium">{{ container.volume }} m³</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard title="Fechas">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-muted">Salida estimada</p>
              <p class="font-medium">{{ formatDate(container.estimated_departure_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Salida real</p>
              <p class="font-medium">{{ formatDate(container.actual_departure_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Arribo estimado</p>
              <p class="font-medium">{{ formatDate(container.estimated_arrival_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Arribo real</p>
              <p class="font-medium">{{ formatDate(container.actual_arrival_date) }}</p>
            </div>
          </div>
        </UPageCard>
      </div>

      <UPageCard title="Timeline">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-medium">Timeline</span>
            <UButton label="Agregar evento" icon="i-lucide-plus" size="xs" variant="outline" @click="showEventForm = !showEventForm" />
          </div>
        </template>

        <div v-if="showEventForm" class="mb-6 p-4 border rounded-lg bg-muted/30 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField label="Tipo de evento">
              <USelect v-model="eventForm.event_type" :items="eventTypes" class="w-full" />
            </UFormField>
            <UFormField label="Fecha">
              <UInput v-model="eventForm.event_date" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Ubicación">
              <UInput v-model="eventForm.location_text" placeholder="Puerto, depósito..." class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Descripción">
            <UInput v-model="eventForm.description" placeholder="Descripción del evento..." class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="ghost" size="sm" @click="showEventForm = false" />
            <UButton label="Guardar" color="primary" size="sm" @click="handleCreateEvent" />
          </div>
        </div>

        <div v-if="container.events?.length" class="relative ml-3 border-l-2 border-muted">
          <div v-for="event in container.events" :key="event.id" class="relative pl-6 pb-6 last:pb-0">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-sm">{{ event.event_type.replace(/_/g, ' ') }}</p>
                <p v-if="event.location_text" class="text-muted text-xs">{{ event.location_text }}</p>
                <p v-if="event.description" class="text-xs mt-1">{{ event.description }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted text-xs">{{ formatDate(event.event_date) }}</span>
                <UButton color="error" variant="ghost" icon="i-lucide-trash" size="xs" @click="handleRemoveEvent(event.id)" />
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm">No hay eventos registrados.</p>
      </UPageCard>
    </template>
  </UPage>
</template>
