<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ContainerForm from '~/components/international-operations/ContainerForm.vue'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type {
  CreateContainerInput,
  UpdateContainerInput,
  InternationalContainer
} from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const containerId = route.params.containerId as string

const { findOneContainer, updateContainer } = useInternationalOperations()

const container = ref<InternationalContainer | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    container.value = await findOneContainer(containerId)
  } finally {
    loading.value = false
  }
})

const initialData = computed<Partial<CreateContainerInput>>(() => {
  const c = container.value
  if (!c) return {}
  return {
    container_number: c.container_number ?? '',
    container_type: c.container_type,
    seal_number: c.seal_number ?? '',
    booking_number: c.booking_number ?? '',
    bill_of_lading: c.bill_of_lading ?? '',
    vessel_name: c.vessel_name ?? '',
    voyage_number: c.voyage_number ?? '',
    origin_port: c.origin_port ?? '',
    origin_port_id: c.origin_port_id ?? undefined,
    destination_port: c.destination_port ?? '',
    destination_port_id: c.destination_port_id ?? undefined,
    estimated_departure_date: c.estimated_departure_date?.split('T')[0] ?? '',
    estimated_arrival_date: c.estimated_arrival_date?.split('T')[0] ?? '',
    weight: c.weight != null ? String(c.weight) : '',
    volume: c.volume != null ? String(c.volume) : '',
    notes: c.notes ?? ''
  }
})

const onSubmit = async (payload: CreateContainerInput) => {
  try {
    await updateContainer(containerId, payload as UpdateContainerInput)
    navigateTo(`/operaciones-internacionales/${container.value?.operation_id ?? ''}/containers/${containerId}`)
  } catch (err) {
    // error is handled by the store
  }
}
</script>

<template>
  <UPage class="space-y-6 max-w-3xl">
    <AppPageHeader
      title="Editar Contenedor"
      :description="container?.container_number ?? 'Contenedor'"
    >
      <template #links>
        <UButton
          label="Volver"
          variant="ghost"
          icon="i-lucide-arrow-left"
          :to="`/operaciones-internacionales/${container?.operation_id ?? ''}/containers/${containerId}`"
        />
      </template>
    </AppPageHeader>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-64 w-full" />
    </div>

    <ContainerForm
      v-if="container"
      :key="container.id"
      :initial-data="initialData"
      submit-label="Guardar cambios"
      :cancel-to="`/operaciones-internacionales/${container.operation_id}/containers/${containerId}`"
      :loading="loading"
      @submit="onSubmit"
    />
  </UPage>
</template>
