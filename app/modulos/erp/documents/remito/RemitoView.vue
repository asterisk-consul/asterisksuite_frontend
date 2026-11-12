<script setup lang="ts">
const props = defineProps<{
  document: any
  mode?: 'sale' | 'purchase'
}>()

const warehouseLabel = computed(() => props.mode === 'purchase' ? 'Depósito de ingreso' : 'Depósito de salida')
const sourceOrderDelivery = computed(() => props.document?.orden_venta_doc ?? null)
const sourceDeliveryPhones = computed<string[]>(() => {
  const delivery = sourceOrderDelivery.value
  const phones = Array.isArray(delivery?.delivery_phones)
    ? delivery.delivery_phones.filter((phone: unknown): phone is string => typeof phone === 'string' && phone.trim() !== '')
    : []
  return phones.length ? phones : delivery?.delivery_phone ? [delivery.delivery_phone] : []
})
const hasSourceOrderDelivery = computed(() => {
  const delivery = sourceOrderDelivery.value
  return Boolean(delivery && [
    delivery.priority,
    delivery.confirmed_delivery_date,
    delivery.delivery_address,
    delivery.delivery_contact,
    ...sourceDeliveryPhones.value,
    delivery.delivery_time,
    delivery.transport_provider,
    delivery.delivery_instructions,
  ].some(value => String(value ?? '').trim() !== ''))
})

type Warehouse = { id: string; name: string }
const sourceWarehouses = computed<Warehouse[]>(() => {
  const values = (props.document?.document_items ?? [])
    .map((item: any) => item.warehouse as Warehouse | null | undefined)
    .filter((warehouse: Warehouse | null | undefined): warehouse is Warehouse => !!warehouse)
  const documentWarehouse = props.document?.warehouse as Warehouse | undefined
  if (documentWarehouse) values.unshift(documentWarehouse)
  const unique = new Map<string, Warehouse>()
  for (const warehouse of values) unique.set(warehouse.id, warehouse)
  return [...unique.values()]
})

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}
</script>

<template>
  <div v-if="document" class="space-y-6">
    <UCard>
      <template #header>
        <h3 class="font-semibold">Datos del remito</h3>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div v-if="document.delivery_date">
          <p class="text-muted">Fecha de entrega</p>
          <p class="font-medium">{{ fmtDate(document.delivery_date) }}</p>
        </div>
        <div v-if="document.descrip">
          <p class="text-muted">Descripción</p>
          <p class="font-medium">{{ document.descrip }}</p>
        </div>
        <div v-if="sourceWarehouses.length" class="col-span-2">
          <p class="text-muted">{{ warehouseLabel }}</p>
          <div class="mt-1 flex flex-wrap gap-2">
            <UBadge v-for="warehouse in sourceWarehouses" :key="warehouse.id" color="neutral" variant="subtle">
              {{ warehouse.name }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <UCard v-if="props.mode !== 'purchase' && hasSourceOrderDelivery">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-semibold">Información de entrega de la OV</h3>
          <UBadge
            v-if="document.parent_document"
            :label="`OV ${document.parent_document.document_types?.code ?? ''}-${String(document.parent_document.number).padStart(8, '0')}`"
            color="neutral"
            variant="subtle"
          />
        </div>
      </template>
      <div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div v-if="sourceOrderDelivery.priority">
          <p class="text-muted">Prioridad</p>
          <UBadge :label="sourceOrderDelivery.priority" color="warning" variant="subtle" />
        </div>
        <div v-if="sourceOrderDelivery.confirmed_delivery_date">
          <p class="text-muted">Fecha comprometida</p>
          <p class="font-medium">{{ fmtDate(sourceOrderDelivery.confirmed_delivery_date) }}</p>
        </div>
        <div v-if="sourceOrderDelivery.delivery_address" class="sm:col-span-2">
          <p class="text-muted">Dirección</p>
          <p class="font-medium">{{ sourceOrderDelivery.delivery_address }}</p>
        </div>
        <div v-if="sourceOrderDelivery.delivery_contact">
          <p class="text-muted">Contacto</p>
          <p class="font-medium">{{ sourceOrderDelivery.delivery_contact }}</p>
        </div>
        <div v-if="sourceDeliveryPhones.length">
          <p class="text-muted">{{ sourceDeliveryPhones.length === 1 ? 'Teléfono' : 'Teléfonos' }}</p>
          <p v-for="(phone, index) in sourceDeliveryPhones" :key="`${index}-${phone}`" class="font-medium">{{ phone }}</p>
        </div>
        <div v-if="sourceOrderDelivery.delivery_time">
          <p class="text-muted">Horario / tiempo</p>
          <p class="font-medium">{{ sourceOrderDelivery.delivery_time }}</p>
        </div>
        <div v-if="sourceOrderDelivery.transport_provider">
          <p class="text-muted">Transporte</p>
          <p class="font-medium">{{ sourceOrderDelivery.transport_provider }}</p>
        </div>
        <div v-if="sourceOrderDelivery.delivery_instructions" class="sm:col-span-2">
          <p class="text-muted">Instrucciones</p>
          <p class="whitespace-pre-wrap font-medium">{{ sourceOrderDelivery.delivery_instructions }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
