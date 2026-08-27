<script setup lang="ts">
const props = defineProps<{
  modelValue?: any
  loading?: boolean
  showActions?: boolean
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
}>()

const form = reactive({
  priority: 'MEDIA',
  confirmed_delivery_date: '',
  delivery_address: '',
  delivery_contact: '',
  delivery_phone: '',
  delivery_time: '',
  transport_provider: '',
  delivery_instructions: '',
})

watch(() => props.modelValue, (val) => {
  if (val) Object.assign(form, val)
}, { immediate: true })

const getFormData = () => ({ ...form })
defineExpose({ getFormData })
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">Información de recepción</h3>
    </template>
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="Prioridad" name="priority">
          <USelectMenu v-model="form.priority" :items="[
            { label: 'Baja', value: 'BAJA' },
            { label: 'Media', value: 'MEDIA' },
            { label: 'Alta', value: 'ALTA' },
            { label: 'Urgente', value: 'URGENTE' },
          ]" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Fecha estimada de entrega" name="confirmed_delivery_date">
          <UInput v-model="form.confirmed_delivery_date" type="date" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Dirección de recepción" name="delivery_address">
        <UInput v-model="form.delivery_address" placeholder="Dirección donde recibir la mercadería" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UFormField label="Contacto" name="delivery_contact">
          <UInput v-model="form.delivery_contact" placeholder="Nombre del contacto" class="w-full" />
        </UFormField>
        <UFormField label="Teléfono" name="delivery_phone">
          <UInput v-model="form.delivery_phone" placeholder="11-1234-5678" class="w-full" />
        </UFormField>
        <UFormField label="Tiempo de entrega" name="delivery_time">
          <UInput v-model="form.delivery_time" placeholder="Ej: 7-10 días" class="w-full" />
        </UFormField>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="Transporte" name="transport_provider">
          <UInput v-model="form.transport_provider" placeholder="Nombre del transporte" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Instrucciones de recepción" name="delivery_instructions">
        <UTextarea v-model="form.delivery_instructions" placeholder="Ej: Recibir por la mañana, llamar al llegar" class="w-full" :rows="2" />
      </UFormField>
    </div>
  </UCard>
</template>
