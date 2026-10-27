<script setup lang="ts">
const props = defineProps<{
  modelValue?: any
  loading?: boolean
  showActions?: boolean
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
  'update:modelValue': [value: Record<string, any>]
}>()

const form = reactive({
  priority: 'MEDIA',
  delivery_address: '',
  delivery_contact: '',
  delivery_phone: '',
  delivery_time: '',
  delivery_instructions: '',
  transport_provider: '',
  confirmed_delivery_date: ''
})
const hasDeliveryDetails = computed(() => Object.values(form).some(value => String(value ?? '').trim() !== '' && value !== 'MEDIA'))

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return

    Object.assign(form, {
      priority: val.priority ?? 'MEDIA',
      delivery_address: val.delivery_address ?? '',
      delivery_contact: val.delivery_contact ?? '',
      delivery_phone: val.delivery_phone ?? '',
      delivery_time: val.delivery_time ?? '',
      delivery_instructions: val.delivery_instructions ?? '',
      transport_provider: val.transport_provider ?? '',
      confirmed_delivery_date: val.confirmed_delivery_date ? String(val.confirmed_delivery_date).slice(0, 10) : ''
    })
  },
  { immediate: true }
)

watch(form, (value) => emit('update:modelValue', { ...value }), { deep: true, immediate: true })

// Expose form data for parent to read
const getFormData = () => {
  const data: Record<string, any> = {
    priority: form.priority,
    delivery_address: form.delivery_address,
    delivery_contact: form.delivery_contact,
    delivery_phone: form.delivery_phone,
    delivery_time: form.delivery_time,
    delivery_instructions: form.delivery_instructions,
    transport_provider: form.transport_provider,
    confirmed_delivery_date: form.confirmed_delivery_date
  }
  // Los inputs date vacíos entregan ""; el backend espera una fecha ISO
  // válida o que la propiedad no sea enviada.
  if (!data.confirmed_delivery_date) data.confirmed_delivery_date = undefined
  return data
}
defineExpose({ getFormData })
</script>

<template>
  <details :open="hasDeliveryDetails" class="group overflow-hidden rounded-xl border border-default bg-default transition-all group-open:border-primary/40 group-open:shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 border-l-4 border-primary/60 bg-primary/5 px-4 py-3.5 transition-colors hover:bg-primary/10 [&::-webkit-details-marker]:hidden">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UIcon name="i-lucide-truck" class="size-5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold">Información de entrega</h3>
            <UBadge label="Opcional" color="neutral" variant="subtle" size="xs" />
          </div>
          <p class="mt-0.5 text-xs text-muted">Dirección, contacto, transporte y fecha comprometida</p>
        </div>
      </div>
      <span class="flex shrink-0 items-center gap-2 rounded-lg border border-default bg-default/70 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors group-open:border-primary/20 group-open:bg-primary/10 group-open:text-primary">
        <span class="group-open:hidden">Completar</span>
        <span class="hidden group-open:inline">Contraer</span>
        <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <div class="flex flex-col gap-4 border-t border-default bg-elevated/20 px-4 py-5 sm:px-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="Prioridad" name="priority">
          <USelectMenu
            v-model="form.priority"
            :items="[
              { label: 'Baja', value: 'BAJA' },
              { label: 'Media', value: 'MEDIA' },
              { label: 'Alta', value: 'ALTA' },
              { label: 'Urgente', value: 'URGENTE' }
            ]"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Fecha comprometida" name="confirmed_delivery_date">
          <UInput v-model="form.confirmed_delivery_date" type="date" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Dirección de entrega" name="delivery_address">
        <UInput v-model="form.delivery_address" placeholder="Dirección completa" class="w-full" />
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
      <UFormField label="Instrucciones de entrega" name="delivery_instructions">
        <UTextarea
          v-model="form.delivery_instructions"
          placeholder="Ej: Entregar por la mañana, llamar al llegar"
          class="w-full"
          :rows="2"
        />
      </UFormField>
    </div>
  </details>
</template>
