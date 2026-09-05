<script setup lang="ts">
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import LocationForm from './LocationForm.vue'
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  success: [location: Location]
}>()

const store = useLocationsStore()
const toast = useToast()
const loading = ref(false)

async function handleSubmit(data: any) {
  loading.value = true
  try {
    const created = await store.create(data)
    toast.add({ title: 'Ubicación creada', color: 'success' })
    open.value = false
    emit('success', created)
  } catch (e: any) {
    toast.add({ title: 'Error al crear ubicación', description: e?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Nueva ubicación" :ui="{ width: 'max-w-lg' }">
    <template #body>
      <LocationForm :loading="loading" @submit="handleSubmit" @cancel="open = false" />
    </template>
  </UModal>
</template>
