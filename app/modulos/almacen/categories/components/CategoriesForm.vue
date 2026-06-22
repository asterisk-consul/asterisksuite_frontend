<script setup lang="ts">
const form = defineModel<{
  name: string
}>({
  default: () => ({
    name: ''
  })
})

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField label="Nombre">
      <UInput
        v-model="form.name"
        placeholder="Ej: Sillas de oficina"
        autofocus
        @keydown.enter="emit('submit')"
      />
    </UFormField>
  </div>
</template>
