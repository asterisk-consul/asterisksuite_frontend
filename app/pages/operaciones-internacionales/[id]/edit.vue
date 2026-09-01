<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OperationForm from '~/components/international-operations/OperationForm.vue'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type {
  CreateOperationInput,
  UpdateOperationInput
} from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const id = route.params.id as string

const { current: operation, loading, fetchOne, update } = useInternationalOperations()

fetchOne(id)

const initialData = computed<Partial<CreateOperationInput>>(() => {
  if (!operation.value) return {}
  return {
    name: operation.value.name ?? '',
    operation_type: operation.value.operation_type,
    transport_type: operation.value.transport_type,
    origin_country: operation.value.origin_country ?? '',
    origin_location: operation.value.origin_location ?? '',
    origin_location_id: operation.value.origin_location_id ?? undefined,
    destination_country: operation.value.destination_country ?? '',
    destination_location: operation.value.destination_location ?? '',
    destination_location_id: operation.value.destination_location_id ?? undefined,
    estimated_departure_date: operation.value.estimated_departure_date?.split('T')[0] ?? '',
    estimated_arrival_date: operation.value.estimated_arrival_date?.split('T')[0] ?? '',
    currency_code: operation.value.currency_code ?? 'USD',
    incoterm: operation.value.incoterm ?? undefined,
    notes: operation.value.notes ?? ''
  }
})

const onSubmit = async (payload: CreateOperationInput) => {
  try {
    await update(id, payload as UpdateOperationInput)
    navigateTo(`/operaciones-internacionales/${id}`)
  } catch (err) {
    // error is handled by the store
  }
}
</script>

<template>
  <UPage class="space-y-6 max-w-3xl">
    <AppPageHeader title="Editar Operación" :description="operation?.number ?? 'Operación Internacional'">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" :to="`/operaciones-internacionales/${id}`" />
      </template>
    </AppPageHeader>

    <div v-if="loading && !operation" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-64 w-full" />
    </div>

    <OperationForm
      v-if="operation"
      :key="operation.id"
      :initial-data="initialData"
      submit-label="Guardar cambios"
      :cancel-to="`/operaciones-internacionales/${id}`"
      :loading="loading"
      @submit="onSubmit"
    />
  </UPage>
</template>
