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

// Expose form data for parent to read
const getFormData = () => ({ ...form })
defineExpose({ getFormData })
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">Datos del Presupuesto</h3>
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
      <UFormField label="Observaciones comerciales" name="commercial_notes">
        <UTextarea v-model="form.commercial_notes" placeholder="Ej: El precio incluye instalación" class="w-full" :rows="2" />
      </UFormField>
      <UFormField label="Observaciones internas" name="internal_notes">
        <UTextarea v-model="form.internal_notes" placeholder="Ej: Seguimiento la semana próxima" class="w-full" :rows="2" />
      </UFormField>
      <UFormField label="Exclusiones" name="exclusions">
        <UTextarea v-model="form.exclusions" placeholder="Ej: No incluye flete" class="w-full" :rows="2" />
      </UFormField>
      <UFormField label="Términos y condiciones" name="terms_and_conditions">
        <UTextarea v-model="form.terms_and_conditions" placeholder="Texto largo con términos..." class="w-full" :rows="4" />
      </UFormField>
    </div>
  </UCard>
</template>
