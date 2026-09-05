<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import ContainerForm from '~/components/international-operations/ContainerForm.vue'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type { CreateContainerInput } from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const operationId = route.params.id as string

const { createContainer, loading } = useInternationalOperations()

const onSubmit = async (payload: CreateContainerInput) => {
  try {
    await createContainer(operationId, payload)
    router.push(`/operaciones-internacionales/${operationId}`)
  } catch (err) {
    // handled by store
  }
}
</script>

<template>
  <UPage class="space-y-6 max-w-3xl">
    <AppPageHeader title="Nuevo Contenedor" description="Agregar un contenedor a la operación">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" :to="`/operaciones-internacionales/${operationId}`" />
      </template>
    </AppPageHeader>

    <ContainerForm
      submit-label="Crear contenedor"
      :loading="loading"
      :cancel-to="`/operaciones-internacionales/${operationId}`"
      @submit="onSubmit"
    />
  </UPage>
</template>
