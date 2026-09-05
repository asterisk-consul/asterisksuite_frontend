<script setup lang="ts">
import DocumentTypeForm from './DocumentTypeForm.vue'
import type { DocumentTypeFormData } from './DocumentTypeForm.vue'

const props = defineProps<{
  documentType?: any
  loading?: boolean
}>()

const emit = defineEmits<{
  success: [data: DocumentTypeFormData]
}>()

const open = defineModel<boolean>('open', { default: false })

const handleSubmit = (form: DocumentTypeFormData) => {
  emit('success', form)
}
</script>

<template>
  <UModal v-model:open="open" :title="documentType?.id ? 'Editar tipo de documento' : 'Nuevo tipo de documento'" :ui="{ width: 'max-w-2xl' }">
    <template #body>
      <DocumentTypeForm
        :model-value="documentType"
        :loading="loading"
        @submit="handleSubmit"
        @cancel="open = false"
      />
    </template>
  </UModal>
</template>
