<!-- components/units/UnitModal.vue -->
<script setup lang="ts">
import UnitForm from './UnitForm.vue'

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [data: any]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const handleSubmit = async (data: any) => {
  emit('submit', data)
  emit('update:open', false)
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Crear unidad">
    <template #body>
      <div class="p-6">
        <UnitForm @submit="handleSubmit" />
      </div>
    </template>
  </UModal>
</template>
