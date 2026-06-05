<script setup lang="ts">
import CostTemplateSelector from '~/modulos/logistica/master-data/product/cost-templates/components/CostTemplateSelector.vue'
const props = defineProps<{
  open: boolean
  productId: string
  currentTemplateId: string | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  assigned: []
}>()

const handleAssigned = () => {
  emit('assigned')
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" title="Seleccionar template" @update:open="emit('update:open', $event)">
    <template #body>
      <CostTemplateSelector
        :product-id="productId"
        :current-template-id="currentTemplateId"
        @assigned="handleAssigned"
        @closed="emit('update:open', false)"
      />
    </template>
  </UModal>
</template>
