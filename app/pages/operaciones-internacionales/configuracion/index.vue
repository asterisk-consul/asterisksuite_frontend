<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIntlOpsSettingsStore } from '~/modulos/international-operations/store/intl-ops-settings.store'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const toast = useToast()
const settingsStore = useIntlOpsSettingsStore()

const saving = ref(false)

const containerFieldDefs: { key: string; label: string; description: string }[] = [
  { key: 'container_number', label: 'Número de contenedor', description: 'Identificador del contenedor (ej: MSCU1234567).' },
  { key: 'container_type', label: 'Tipo', description: "Tipo de contenedor (20', 40', etc.)." },
  { key: 'seal_number', label: 'Número de sello', description: 'Precinto de seguridad del contenedor.' },
  { key: 'booking_number', label: 'Booking', description: 'Número de reserva con la naviera.' },
  { key: 'bill_of_lading', label: 'Bill of Lading', description: 'Conocimiento de embarque.' },
  { key: 'vessel_name', label: 'Buque', description: 'Nombre del buque.' },
  { key: 'voyage_number', label: 'Número de viaje', description: 'Número de viaje del buque.' },
  { key: 'origin_port', label: 'Puerto de origen', description: 'Puerto de embarque.' },
  { key: 'destination_port', label: 'Puerto de destino', description: 'Puerto de arribo.' },
  { key: 'estimated_departure_date', label: 'Salida estimada', description: 'Fecha estimada de salida.' },
  { key: 'estimated_arrival_date', label: 'Arribo estimado', description: 'Fecha estimada de arribo (ETA).' },
  { key: 'weight', label: 'Peso (kg)', description: 'Peso bruto de la carga.' },
  { key: 'volume', label: 'Volumen (m³)', description: 'Volumen de la carga.' },
  { key: 'notes', label: 'Notas', description: 'Notas adicionales del contenedor.' }
]

const operationFieldDefs: { key: string; label: string; description: string }[] = [
  { key: 'name', label: 'Nombre descriptivo', description: 'Nombre para identificar la operación.' },
  { key: 'operation_type', label: 'Tipo de operación', description: 'Importación, exportación u otro.' },
  { key: 'transport_type', label: 'Medio de transporte', description: 'Marítimo, aéreo, terrestre, multimodal u otro.' },
  { key: 'currency_code', label: 'Moneda', description: 'Moneda de la operación.' },
  { key: 'incoterm', label: 'Incoterm', description: 'Término comercial internacional (FOB, CIF, etc.).' },
  { key: 'origin_location_id', label: 'Ubicación de origen', description: 'Sección Origen con país y ciudad.' },
  { key: 'destination_location_id', label: 'Ubicación de destino', description: 'Sección Destino con país y ciudad.' },
  { key: 'estimated_departure_date', label: 'Salida estimada', description: 'Fecha estimada de salida de la operación.' },
  { key: 'estimated_arrival_date', label: 'Arribo estimado (ETA)', description: 'Fecha estimada de arribo de la operación.' },
  { key: 'customs_broker_op_number', label: 'N° OP Despachante', description: 'Número de operación del despachante de aduana.' },
  { key: 'sim_number', label: 'SIM', description: 'Solicitud de internación de mercadería.' },
  { key: 'supplier_purchase_order', label: 'Orden de compra proveedor', description: 'Referencia de la orden de compra al proveedor.' },
  { key: 'notes', label: 'Notas', description: 'Notas adicionales de la operación.' }
]

const operationStatusDefs: { value: string; label: string }[] = [
  { value: 'PLANNED', label: 'Planificada' },
  { value: 'IN_PREPARATION', label: 'En Preparación' },
  { value: 'SHIPPED', label: 'Embarcada' },
  { value: 'IN_TRANSIT', label: 'En Tránsito' },
  { value: 'ARRIVED', label: 'Arribada' },
  { value: 'CUSTOMS', label: 'Aduana' },
  { value: 'RELEASED', label: 'Liberada' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'CLOSED', label: 'Cerrada' },
  { value: 'CANCELLED', label: 'Cancelada' }
]

const containerStatusDefs: { value: string; label: string }[] = [
  { value: 'PREPARING', label: 'Preparando' },
  { value: 'LOADED', label: 'Cargado' },
  { value: 'SHIPPED', label: 'Embarcado' },
  { value: 'IN_TRANSIT', label: 'En Tránsito' },
  { value: 'ARRIVED', label: 'Arribado' },
  { value: 'CUSTOMS', label: 'Aduana' },
  { value: 'RELEASED', label: 'Liberado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CLOSED', label: 'Cerrado' }
]

const form = ref({
  container_fields: {} as Record<string, boolean>,
  operation_fields: {} as Record<string, boolean>,
  operation_statuses: [] as string[],
  container_statuses: [] as string[]
})

async function load() {
  try {
    const data = await settingsStore.fetchSettings(true)
    form.value.container_fields = { ...(data?.container_fields ?? {}) }
    form.value.operation_fields = { ...(data?.operation_fields ?? {}) }
    form.value.operation_statuses = [...(data?.operation_statuses ?? operationStatusDefs.map(s => s.value))]
    form.value.container_statuses = [...(data?.container_statuses ?? containerStatusDefs.map(s => s.value))]
  } catch {
    toast.add({ title: 'No se pudo cargar la configuración', color: 'error' })
  }
}

function toggleStatus(list: string[], value: string) {
  const idx = list.indexOf(value)
  if (idx === -1) list.push(value)
  else list.splice(idx, 1)
}

async function save() {
  saving.value = true
  try {
    await settingsStore.saveSettings({
      container_fields: form.value.container_fields,
      operation_fields: form.value.operation_fields,
      operation_statuses: form.value.operation_statuses,
      container_statuses: form.value.container_statuses
    })
    toast.add({ title: 'Configuración guardada', description: 'Se aplicará a los formularios de operaciones internacionales.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 pb-24">
    <UPageHeader
      title="Configuración de Operaciones Internacionales"
      description="Definí qué campos se cargan en contenedores y operaciones, y qué estados están habilitados."
    />

    <div v-if="settingsStore.loading && !settingsStore.loaded" class="py-16 text-center text-muted">
      Cargando configuración…
    </div>

    <template v-else>
      <UPageCard title="Campos del contenedor" description="Qué datos se piden al crear o editar un contenedor.">
        <div class="space-y-4">
          <div v-for="field in containerFieldDefs" :key="field.key" class="flex items-start justify-between gap-6">
            <div>
              <p class="font-medium">{{ field.label }}</p>
              <p class="text-sm text-muted">{{ field.description }}</p>
            </div>
            <USwitch v-model="form.container_fields[field.key]" />
          </div>
        </div>
      </UPageCard>

      <UPageCard title="Campos de la operación" description="Datos aduaneros y comerciales de la operación.">
        <div class="space-y-4">
          <div v-for="field in operationFieldDefs" :key="field.key" class="flex items-start justify-between gap-6">
            <div>
              <p class="font-medium">{{ field.label }}</p>
              <p class="text-sm text-muted">{{ field.description }}</p>
            </div>
            <USwitch v-model="form.operation_fields[field.key]" />
          </div>
        </div>
      </UPageCard>

      <UPageCard title="Estados de operación" description="Qué estados puede tener una operación internacional.">
        <div class="grid gap-2 sm:grid-cols-2">
          <UButton
            v-for="s in operationStatusDefs"
            :key="s.value"
            :variant="form.operation_statuses.includes(s.value) ? 'solid' : 'outline'"
            :color="form.operation_statuses.includes(s.value) ? 'primary' : 'neutral'"
            class="justify-start"
            @click="toggleStatus(form.operation_statuses, s.value)"
          >
            <UIcon :name="form.operation_statuses.includes(s.value) ? 'i-lucide-check' : 'i-lucide-minus'" class="mr-2" />
            {{ s.label }}
          </UButton>
        </div>
      </UPageCard>

      <UPageCard title="Estados del contenedor" description="Qué estados puede tener un contenedor.">
        <div class="grid gap-2 sm:grid-cols-2">
          <UButton
            v-for="s in containerStatusDefs"
            :key="s.value"
            :variant="form.container_statuses.includes(s.value) ? 'solid' : 'outline'"
            :color="form.container_statuses.includes(s.value) ? 'primary' : 'neutral'"
            class="justify-start"
            @click="toggleStatus(form.container_statuses, s.value)"
          >
            <UIcon :name="form.container_statuses.includes(s.value) ? 'i-lucide-check' : 'i-lucide-minus'" class="mr-2" />
            {{ s.label }}
          </UButton>
        </div>
      </UPageCard>
    </template>

    <div class="sticky bottom-4 z-10 flex justify-end rounded-xl border border-default bg-default/95 p-3 shadow-lg backdrop-blur">
      <UButton label="Guardar configuración" icon="i-lucide-save" :loading="saving" :disabled="settingsStore.loading" @click="save" />
    </div>
  </div>
</template>
