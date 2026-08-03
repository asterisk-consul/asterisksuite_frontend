<script setup lang="ts">
const props = defineProps<{
  modelValue?: any
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
}>()

const form = reactive({
  document_type_id: '',
  party_id: '',
  date: new Date().toISOString().split('T')[0],
  currency_code: 'ARS',
  descrip: '',
  ref: '',
  items: [] as any[],
  delivery_date: new Date().toISOString().split('T')[0],
})

watch(() => props.modelValue, (val) => {
  if (val) Object.assign(form, val)
}, { immediate: true })

const submit = () => emit('submit', { ...form })
</script>

<template>
  <UForm :state="form" class="space-y-6" @submit="submit">
    <UCard>
      <template #header>
        <h3 class="font-semibold">Datos del remito</h3>
      </template>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Fecha de entrega" name="delivery_date">
            <UInput v-model="form.delivery_date" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Descripción" name="descrip">
            <UInput v-model="form.descrip" class="w-full" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <div class="flex justify-end gap-3">
      <UButton variant="soft" @click="emit('cancel')">Cancelar</UButton>
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
