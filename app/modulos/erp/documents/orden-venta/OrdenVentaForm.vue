<script setup lang="ts">
import { DocumentsSalesService, type SalespersonOption } from '~/modulos/erp/sales/services/sales.service'
import { useEmployeesService } from '~/modulos/erp/employees/service/employees.service'

const props = defineProps<{
  modelValue?: any
  loading?: boolean
  showActions?: boolean
  requireDeliveryAddress?: boolean
  warnWhenDeliveryDataEmpty?: boolean
  defaultSellerToCurrent?: boolean
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
  'update:modelValue': [value: Record<string, any>]
}>()

const noSellerId = '__NO_SELLER__'
const employeesService = useEmployeesService()
const salespeople = ref<SalespersonOption[]>([])
const sellerOptionsLoading = ref(false)
const sellerOptionsFailed = ref(false)
const sellerOptions = computed(() => [
  { id: noSellerId, name: 'Sin vendedor' },
  ...salespeople.value.map(seller => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`.trim(),
  })),
])

const form = reactive({
  priority: 'MEDIA',
  seller_id: noSellerId,
  delivery_address: '',
  delivery_contact: '',
  delivery_phone: '',
  delivery_time: '',
  delivery_instructions: '',
  transport_provider: '',
  confirmed_delivery_date: ''
})
const deliveryAddressError = ref(false)
const hasDeliveryDetails = computed(() => [
  form.delivery_address,
  form.delivery_contact,
  form.delivery_phone,
  form.delivery_time,
  form.delivery_instructions,
  form.transport_provider,
  form.confirmed_delivery_date
].some(value => String(value ?? '').trim() !== ''))

watch(() => props.requireDeliveryAddress, (required) => {
  if (!required) deliveryAddressError.value = false
})

watch(() => form.delivery_address, (address) => {
  if (address.trim()) deliveryAddressError.value = false
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return

    Object.assign(form, {
      priority: val.priority ?? 'MEDIA',
      seller_id: val.seller_id ?? noSellerId,
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

onMounted(async () => {
  sellerOptionsLoading.value = true
  sellerOptionsFailed.value = false
  try {
    salespeople.value = await DocumentsSalesService.getSalespeople()
  } catch {
    sellerOptionsFailed.value = true
    return
  } finally {
    sellerOptionsLoading.value = false
  }

  if (!props.defaultSellerToCurrent || form.seller_id !== noSellerId) return
  try {
    const currentEmployee = await employeesService.findCurrentUser()
    if (currentEmployee?.is_salesperson && salespeople.value.some(seller => seller.id === currentEmployee.id)) {
      form.seller_id = currentEmployee.id
    }
  } catch {
    // La asignación automática es una ayuda; el vendedor se puede elegir manualmente.
  }
})

watch(form, (value) => emit('update:modelValue', { ...value }), { deep: true, immediate: true })

// Expose form data for parent to read
const validateDeliveryInfo = () => {
  const valid = !props.requireDeliveryAddress || Boolean(form.delivery_address.trim())
  deliveryAddressError.value = !valid
  return valid
}

const getFormData = () => {
  const data: Record<string, any> = {
    priority: form.priority,
    seller_id: form.seller_id === noSellerId ? null : form.seller_id,
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
defineExpose({ getFormData, validateDeliveryInfo })
</script>

<template>
  <div class="flex flex-col gap-3">
    <UCard>
      <div class="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1fr)] sm:items-center">
        <div>
          <h3 class="font-semibold">Vendedor de la venta</h3>
          <p class="mt-1 text-xs text-muted">Identifica quién realizó esta OV para consultar las ventas por vendedor. Las comisiones se administran desde RR. HH.</p>
        </div>
        <div class="flex flex-col gap-2">
          <USelectMenu
            v-model="form.seller_id"
            :items="sellerOptions"
            label-key="name"
            value-key="id"
            placeholder="Seleccionar vendedor"
            class="w-full"
            :loading="sellerOptionsLoading"
            :disabled="sellerOptionsLoading || sellerOptionsFailed || salespeople.length === 0"
          />
          <p v-if="sellerOptionsFailed" class="text-xs text-error">No se pudo cargar la lista de vendedores.</p>
          <p v-else-if="!sellerOptionsLoading && salespeople.length === 0" class="text-xs text-muted">No hay empleados activos habilitados como vendedores.</p>
          <p v-else class="text-xs text-muted">Si tu usuario está vinculado a un vendedor, se preselecciona al crear la OV.</p>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="!requireDeliveryAddress && warnWhenDeliveryDataEmpty !== false && !hasDeliveryDetails"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      title="Sin datos de entrega"
      description="Esta OV todavía no tiene información de entrega cargada. Podés agregarla en esta sección si la necesitás."
    />
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
      <UFormField
        label="Dirección de entrega"
        name="delivery_address"
        :required="requireDeliveryAddress"
        :error="deliveryAddressError ? 'Ingresá la dirección de entrega para guardar la OV.' : undefined"
        :help="requireDeliveryAddress ? 'Obligatoria según el Circuito de ventas.' : 'Opcional según el Circuito de ventas.'"
      >
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
  </div>
</template>
