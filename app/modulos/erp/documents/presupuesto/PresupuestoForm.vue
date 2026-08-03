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
  // ─── Presupuesto fields ──
  validity_date: '',
  warranty_info: '',
  exclusions: '',
  commercial_notes: '',
  internal_notes: '',
  terms_and_conditions: '',
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
    <!-- Observaciones comerciales -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">Observaciones</h3>
      </template>
      <div class="space-y-4">
        <UFormField label="Observaciones comerciales (se imprimen)" name="commercial_notes">
          <UTextarea v-model="form.commercial_notes" placeholder="Ej: El precio incluye instalación" class="w-full" :rows="2" />
        </UFormField>
        <UFormField label="Observaciones internas (NO se imprimen)" name="internal_notes">
          <UTextarea v-model="form.internal_notes" placeholder="Ej: Seguimiento la semana próxima" class="w-full" :rows="2" />
        </UFormField>
      </div>
    </UCard>

    <!-- Condiciones -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">Condiciones</h3>
      </template>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Fecha de vencimiento" name="validity_date">
            <UInput v-model="form.validity_date" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Garantía" name="warranty_info">
            <UInput v-model="form.warranty_info" placeholder="Ej: 12 meses" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Exclusiones" name="exclusions">
          <UTextarea v-model="form.exclusions" placeholder="Ej: No incluye flete" class="w-full" :rows="2" />
        </UFormField>
        <UFormField label="Términos y condiciones" name="terms_and_conditions">
          <UTextarea v-model="form.terms_and_conditions" placeholder="Texto largo con términos..." class="w-full" :rows="4" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end gap-3">
      <UButton variant="soft" @click="emit('cancel')">Cancelar</UButton>
      <UButton type="submit" :loading="loading">Guardar</UButton>
    </div>
  </UForm>
</template>
