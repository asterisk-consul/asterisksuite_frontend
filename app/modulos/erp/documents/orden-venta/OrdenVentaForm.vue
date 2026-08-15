<script setup lang="ts">
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'
import { useAuthStore } from '~/modulos/auth/auth.store'

const props = defineProps<{
  modelValue?: any
  loading?: boolean
  showActions?: boolean
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
}>()

const employeesStore = useEmployeesStore()
const authStore = useAuthStore()

const form = reactive({
  priority: 'MEDIA',
  delivery_address: '',
  delivery_contact: '',
  delivery_phone: '',
  delivery_time: '',
  delivery_instructions: '',
  transport_provider: '',
  confirmed_delivery_date: '',
  seller_id: '',
  commission_rate: null as number | null,
})

const activeEmployees = computed(() =>
  (employeesStore.items ?? []).filter((e: any) => e.is_active)
)

const employeeOptions = computed(() =>
  activeEmployees.value.map((e: any) => ({
    label: `${e.first_name} ${e.last_name}`,
    value: e.id,
    userId: e.user_id,
    defaultCommissionRate: e.default_commission_rate ? Number(e.default_commission_rate) : null,
  }))
)

const defaultSellerId = computed(() => {
  const currentUserId = authStore.user?.id
  if (!currentUserId || !employeeOptions.value.length) return ''
  const match = employeeOptions.value.find((e: any) => e.userId === currentUserId)
  return match?.value ?? ''
})

watch(() => props.modelValue, (val) => {
  if (val) Object.assign(form, val)
}, { immediate: true })

// Set default seller when employees load and no seller is set
watch(activeEmployees, (emps) => {
  if (emps.length && !form.seller_id && defaultSellerId.value) {
    form.seller_id = defaultSellerId.value
    const emp = employeeOptions.value.find((e: any) => e.value === defaultSellerId.value)
    if (emp?.defaultCommissionRate) form.commission_rate = emp.defaultCommissionRate
  }
}, { immediate: true })

// Auto-fill commission_rate from seller's default when seller changes
watch(() => form.seller_id, (sellerId) => {
  if (!sellerId) return
  const emp = employeeOptions.value.find((e: any) => e.value === sellerId)
  if (emp?.defaultCommissionRate) form.commission_rate = emp.defaultCommissionRate
})

onMounted(async () => {
  if (!employeesStore.items?.length) {
    await employeesStore.fetchAll()
  }
})

// Expose form data for parent to read
const getFormData = () => ({ ...form })
defineExpose({ getFormData })
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">Información de entrega</h3>
    </template>
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Prioridad" name="priority">
          <USelectMenu v-model="form.priority" :items="[
            { label: 'Baja', value: 'BAJA' },
            { label: 'Media', value: 'MEDIA' },
            { label: 'Alta', value: 'ALTA' },
            { label: 'Urgente', value: 'URGENTE' },
          ]" value-key="value" class="w-full" />
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
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Vendedor" name="seller_id">
          <USelectMenu
            v-model="form.seller_id"
            :items="employeeOptions"
            value-key="value"
            placeholder="Seleccionar vendedor..."
            class="w-full"
          />
        </UFormField>
        <UFormField label="Comisión (%)" name="commission_rate">
          <UInput
            v-model.number="form.commission_rate"
            type="number"
            placeholder="0.00"
            :min="0"
            :max="100"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField label="Instrucciones de entrega" name="delivery_instructions">
        <UTextarea v-model="form.delivery_instructions" placeholder="Ej: Entregar por la mañana, llamar al llegar" class="w-full" :rows="2" />
      </UFormField>
    </div>
  </UCard>
</template>
