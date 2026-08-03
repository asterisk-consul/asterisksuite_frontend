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
  // ─── OV fields ──
  priority: 'MEDIA',
  delivery_address: '',
  delivery_contact: '',
  delivery_phone: '',
  delivery_time: '',
  delivery_instructions: '',
  transport_provider: '',
  confirmed_delivery_date: '',
})

watch(() => props.modelValue, (val) => {
  if (val) Object.assign(form, val)
}, { immediate: true })

const priorityOptions = [
  { label: 'Baja', value: 'BAJA' },
  { label: 'Media', value: 'MEDIA' },
  { label: 'Alta', value: 'ALTA' },
  { label: 'Urgente', value: 'URGENTE' },
]

const submit = () => emit('submit', { ...form })
</script>

<template>
  <UForm :state="form" class="space-y-6" @submit="submit">
    <!-- Información logística -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">Información de entrega</h3>
      </template>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Prioridad" name="priority">
            <USelectMenu v-model="form.priority" :items="priorityOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField label="Fecha comprometida" name="confirmed_delivery_date">
            <UInput v-model="form.confirmed_delivery_date" type="date" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Dirección de entrega" name="delivery_address">
          <UInput v-model="form.delivery_address" placeholder="Dirección completa" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-3 gap-4">
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
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Transporte" name="transport_provider">
            <UInput v-model="form.transport_provider" placeholder="Nombre del transporte" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Instrucciones de entrega" name="delivery_instructions">
          <UTextarea v-model="form.delivery_instructions" placeholder="Ej: Entregar por la mañana, llamar al llegar" class="w-full" :rows="2" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end gap-3">
      <UButton variant="soft" @click="emit('cancel')">Cancelar</UButton>
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
