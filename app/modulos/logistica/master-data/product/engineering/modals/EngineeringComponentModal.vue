<script setup lang="ts">
import EngineeringComponentForm from '~/modulos/logistica/master-data/product/engineering/components/EngineeringComponentForm.vue'

defineProps<{
  open: boolean
  productId: string
  component?: any | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
}>()

const handleSaved = () => {
  emit('saved')
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" title="Componente de ingeniería" @update:open="emit('update:open', $event)">
    <template #body>
      <EngineeringComponentForm
        :productId="productId"
        :component="component"
        @saved="handleSaved"
        @cancelled="emit('update:open', false)"
      />
    </template>
  </UModal>
</template>
