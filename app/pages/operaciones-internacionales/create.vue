<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import OperationForm from '~/components/international-operations/OperationForm.vue'
import type { CreateOperationWithContainerInput } from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const router = useRouter()
const { create, loading } = useInternationalOperations()

const onSubmit = async (payload: CreateOperationWithContainerInput) => {
  try {
    const created = await create(payload)
    router.push(`/operaciones-internacionales/${created.id}`)
  } catch (err) {
    // error is handled by the store
  }
}
</script>

<template>
  <UPage class="flex w-full max-w-5xl flex-col gap-6">
    <AppPageHeader title="Nueva Operación Internacional" description="Crear una nueva operación de importación/exportación">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" to="/operaciones-internacionales" />
      </template>
    </AppPageHeader>

    <OperationForm submit-label="Crear operación" show-initial-container :loading="loading" @submit="onSubmit" />
  </UPage>
</template>
