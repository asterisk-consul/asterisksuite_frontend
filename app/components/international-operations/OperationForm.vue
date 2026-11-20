<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIntlOpsSettingsStore } from '~/modulos/international-operations/store/intl-ops-settings.store'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import LocationSelect from '~/components/international-operations/LocationSelect.vue'
import InitialContainerFields from '~/components/international-operations/InitialContainerFields.vue'
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'
import type {
  CreateOperationInput,
  CreateContainerInput,
  CreateOperationWithContainerInput,
  OperationType,
  TransportType,
  Incoterm
} from '~/modulos/international-operations/types/international-operations.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CreateOperationInput>
    loading?: boolean
    submitLabel?: string
    cancelTo?: string
    showInitialContainer?: boolean
  }>(),
  {
    initialData: () => ({}),
    loading: false,
    submitLabel: 'Crear operación',
    cancelTo: '/operaciones-internacionales',
    showInitialContainer: false
  }
)

const emit = defineEmits<{
  submit: [payload: CreateOperationWithContainerInput]
}>()

const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()

const settingsStore = useIntlOpsSettingsStore()
const toast = useToast()
const settingsReady = ref(false)
const compactCardUi = { container: 'gap-3 p-3 sm:p-4' }
const createInitialContainer = ref(false)
const initialContainer = ref<CreateContainerInput>({
  container_number: '',
  description: 'Contenedor N°1 - ',
  container_type: 'TWENTY_DV',
  seal_number: '',
  booking_number: '',
  bill_of_lading: '',
  vessel_name: '',
  voyage_number: '',
  origin_port: '',
  origin_port_id: undefined,
  destination_port: '',
  destination_port_id: undefined,
  estimated_departure_date: '',
  estimated_arrival_date: '',
  weight: '',
  volume: '',
  notes: ''
})

onMounted(async () => {
  initCurrencies()
  try {
    await settingsStore.fetchSettings(true)
    initialContainer.value.description = settingsStore.nextContainerDescription
  } catch {
    // Si falla, se muestra el form con los valores por defecto
  } finally {
    settingsReady.value = true
  }
})

const form = ref<CreateOperationInput>({
  name: '',
  operation_type: 'IMPORT',
  transport_type: 'MARITIME',
  origin_country: '',
  origin_location: '',
  origin_location_id: undefined,
  destination_country: 'Argentina',
  destination_location: '',
  destination_location_id: undefined,
  currency_code: 'USD',
  incoterm: undefined,
  customs_broker_op_number: '',
  sim_number: '',
  supplier_purchase_order: '',
  notes: '',
  ...props.initialData
})

watch(createInitialContainer, (enabled) => {
  if (!enabled) return
  if (!initialContainer.value.estimated_departure_date && form.value.estimated_departure_date) {
    initialContainer.value.estimated_departure_date = form.value.estimated_departure_date
  }
  if (!initialContainer.value.estimated_arrival_date && form.value.estimated_arrival_date) {
    initialContainer.value.estimated_arrival_date = form.value.estimated_arrival_date
  }
})

const handleOriginLocationSelect = (location: Location | null) => {
  form.value.origin_country = location?.country ?? ''
  form.value.origin_location = location?.city ?? location?.address ?? ''
}

const handleDestinationLocationSelect = (location: Location | null) => {
  form.value.destination_country = location?.country ?? ''
  form.value.destination_location = location?.city ?? location?.address ?? ''
}

const resolvedSubmitLabel = computed(() =>
  props.showInitialContainer && createInitialContainer.value
    ? 'Crear operación y contenedor'
    : props.submitLabel
)

const operationTypes: { label: string; value: OperationType }[] = [
  { label: 'Importación', value: 'IMPORT' },
  { label: 'Exportación', value: 'EXPORT' },
  { label: 'Otro', value: 'OTHER' }
]

const transportTypes: { label: string; value: TransportType }[] = [
  { label: 'Marítimo', value: 'MARITIME' },
  { label: 'Aéreo', value: 'AIR' },
  { label: 'Terrestre', value: 'LAND' },
  { label: 'Multimodal', value: 'MULTIMODAL' },
  { label: 'Otro', value: 'OTHER' }
]

const incotermOptions: { label: string; value: Incoterm }[] = [
  { label: 'EXW - Ex Works', value: 'EXW' },
  { label: 'FCA - Free Carrier', value: 'FCA' },
  { label: 'FOB - Free On Board', value: 'FOB' },
  { label: 'CFR - Cost and Freight', value: 'CFR' },
  { label: 'CIF - Cost, Insurance & Freight', value: 'CIF' },
  { label: 'CPT - Carriage Paid To', value: 'CPT' },
  { label: 'CIP - Carriage & Insurance Paid To', value: 'CIP' },
  { label: 'DAP - Delivered at Place', value: 'DAP' },
  { label: 'DPU - Delivered at Place Unloaded', value: 'DPU' },
  { label: 'DDP - Delivered Duty Paid', value: 'DDP' }
]

const incotermDescriptions: Record<string, { title: string; desc: string; seller: string; buyer: string }> = {
  EXW: {
    title: 'Ex Works (En fábrica)',
    desc: 'El vendedor pone la mercadería a disposición del comprador en sus instalaciones.',
    seller: 'Entrega mercadería en fábrica',
    buyer: 'Transporte, seguro, despacho, todo'
  },
  FCA: {
    title: 'Free Carrier (Libre transportista)',
    desc: 'El vendedor entrega la mercadería al transportista designado por el comprador en un lugar acordado.',
    seller: 'Transporte hasta el transportista, despacho de exportación',
    buyer: 'Transporte principal, seguro, despacho de importación'
  },
  FOB: {
    title: 'Free On Board (Libre a bordo)',
    desc: 'El vendedor entrega la mercadería a bordo del buque en el puerto de embarque.',
    seller: 'Carga en buque, despacho de exportación',
    buyer: 'Flete marítimo, seguro, despacho de importación'
  },
  CFR: {
    title: 'Cost and Freight (Costo y flete)',
    desc: 'El vendedor paga el flete hasta el puerto de destino, pero el riesgo se transfiere al embarcar.',
    seller: 'Flete hasta puerto de destino, despacho de exportación',
    buyer: 'Seguro, despacho de importación'
  },
  CIF: {
    title: 'Cost, Insurance & Freight (Costo, seguro y flete)',
    desc: 'Igual que CFR pero el vendedor también contrata el seguro marítimo.',
    seller: 'Flete, seguro marítimo, despacho de exportación',
    buyer: 'Despacho de importación'
  },
  CPT: {
    title: 'Carriage Paid To (Flete pagado hasta)',
    desc: 'El vendedor paga el flete hasta el destino acordado. El riesgo se transfiere al entregar al primer transportista.',
    seller: 'Transporte hasta destino, despacho de exportación',
    buyer: 'Seguro, despacho de importación'
  },
  CIP: {
    title: 'Carriage & Insurance Paid To (Flete y seguro pagados hasta)',
    desc: 'Igual que CPT pero el vendedor contrata el seguro.',
    seller: 'Transporte, seguro, despacho de exportación',
    buyer: 'Despacho de importación'
  },
  DAP: {
    title: 'Delivered at Place (Entregado en lugar)',
    desc: 'El vendedor entrega la mercadería lista para descarga en el destino acordado.',
    seller: 'Transporte, seguro, entrega en destino',
    buyer: 'Descarga, despacho de importación'
  },
  DPU: {
    title: 'Delivered at Place Unloaded (Entregado y descargado)',
    desc: 'El vendedor entrega y descarga la mercadería en el destino.',
    seller: 'Transporte, seguro, descarga en destino',
    buyer: 'Despacho de importación'
  },
  DDP: {
    title: 'Delivered Duty Paid (Entregado con derechos pagados)',
    desc: 'El vendedor asume todos los costos incluyendo impuestos y despacho aduanero en el destino.',
    seller: 'Todo: transporte, seguro, despacho, impuestos',
    buyer: 'Recibe mercadería lista para usar'
  }
}

const onSubmit = () => {
  const payload: CreateOperationWithContainerInput = { ...form.value }
  if (props.showInitialContainer && createInitialContainer.value) {
    const containerNumber = initialContainer.value.container_number.trim()
    if (!containerNumber) {
      toast.add({
        title: 'Falta el número de contenedor',
        description: 'Completalo para crear la operación junto con el contenedor.',
        color: 'warning'
      })
      return
    }

    payload.initial_container = {
      ...initialContainer.value,
      container_number: containerNumber,
      estimated_departure_date: initialContainer.value.estimated_departure_date || form.value.estimated_departure_date || undefined,
      estimated_arrival_date: initialContainer.value.estimated_arrival_date || form.value.estimated_arrival_date || undefined
    }
  }
  emit('submit', payload)
}
</script>

<template>
  <div v-if="!settingsReady" class="flex flex-col gap-3">
    <USkeleton class="h-36 w-full" />
    <USkeleton class="h-28 w-full" />
  </div>
  <UForm v-else :state="form" @submit="onSubmit" class="flex flex-col gap-3 sm:gap-4">
    <UPageCard
      v-if="settingsStore.isOperationFieldVisible('name') || settingsStore.isOperationFieldVisible('operation_type') || settingsStore.isOperationFieldVisible('transport_type') || settingsStore.isOperationFieldVisible('currency_code') || settingsStore.isOperationFieldVisible('incoterm') || settingsStore.isOperationFieldVisible('estimated_departure_date') || settingsStore.isOperationFieldVisible('estimated_arrival_date')"
      title="Datos de la operación"
      :ui="compactCardUi"
    >
      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        <UFormField
          v-if="settingsStore.isOperationFieldVisible('name')"
          label="Nombre descriptivo"
          name="name"
        >
          <UInput v-model="form.name" placeholder="Ej: Importación-componentes-Shanghai" class="w-full" />
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('operation_type')"
          label="Tipo de operación"
          name="operation_type"
        >
          <USelect v-model="form.operation_type" :items="operationTypes" class="w-full" />
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('transport_type')"
          label="Medio de transporte"
          name="transport_type"
        >
          <USelect v-model="form.transport_type" :items="transportTypes" class="w-full" />
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('currency_code')"
          label="Moneda"
          name="currency_code"
        >
          <USelect v-model="form.currency_code" :items="currencyOptions" placeholder="Seleccionar moneda" class="w-full" />
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('incoterm')"
          label="Incoterm"
          name="incoterm"
        >
          <div class="flex items-center gap-2">
            <USelect v-model="form.incoterm" :items="incotermOptions" placeholder="Seleccionar..." class="flex-1" />
            <UPopover>
              <UIcon name="i-lucide-help-circle" class="h-5 w-5 text-muted shrink-0 cursor-help hover:text-default transition-colors" />
              <template #content>
                <div class="p-4 max-h-96 overflow-y-auto w-96 space-y-3">
                  <p class="text-xs font-semibold text-muted uppercase tracking-wide">Incoterms 2020</p>
                  <div v-for="(desc, code) in incotermDescriptions" :key="code" class="space-y-1 border-b border-default pb-2 last:border-0">
                    <p class="font-medium text-sm">{{ code }} — {{ desc.title }}</p>
                    <p class="text-xs text-muted">{{ desc.desc }}</p>
                    <div class="flex gap-4 text-xs">
                      <span class="text-success-500">Vendedor: {{ desc.seller }}</span>
                      <span class="text-error-500">Comprador: {{ desc.buyer }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('estimated_departure_date')"
          label="Salida estimada"
          name="estimated_departure_date"
        >
          <UInput v-model="form.estimated_departure_date" type="date" class="w-full" />
        </UFormField>

        <UFormField
          v-if="settingsStore.isOperationFieldVisible('estimated_arrival_date')"
          label="Arribo estimado (ETA)"
          name="estimated_arrival_date"
        >
          <UInput v-model="form.estimated_arrival_date" type="date" class="w-full" />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard
      v-if="settingsStore.isOperationFieldVisible('origin_location_id') || settingsStore.isOperationFieldVisible('destination_location_id')"
      title="Origen y destino"
      description="Ubicaciones de salida y llegada de la operación."
      :ui="compactCardUi"
    >
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div v-if="settingsStore.isOperationFieldVisible('origin_location_id')" class="min-w-0 space-y-3">
          <UFormField label="Origen" name="origin_location_id">
            <LocationSelect
              v-model="form.origin_location_id"
              placeholder="Seleccionar ubicación de origen"
              @select="handleOriginLocationSelect"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-2">
            <UFormField label="País" name="origin_country">
              <UInput v-model="form.origin_country" placeholder="País" disabled class="w-full" />
            </UFormField>
            <UFormField label="Ciudad" name="origin_location">
              <UInput v-model="form.origin_location" placeholder="Ciudad" disabled class="w-full" />
            </UFormField>
          </div>
        </div>

        <div v-if="settingsStore.isOperationFieldVisible('destination_location_id')" class="min-w-0 space-y-3">
          <UFormField label="Destino" name="destination_location_id">
            <LocationSelect
              v-model="form.destination_location_id"
              placeholder="Seleccionar ubicación de destino"
              @select="handleDestinationLocationSelect"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-2">
            <UFormField label="País" name="destination_country">
              <UInput v-model="form.destination_country" placeholder="País" disabled class="w-full" />
            </UFormField>
            <UFormField label="Ciudad" name="destination_location">
              <UInput v-model="form.destination_location" placeholder="Ciudad" disabled class="w-full" />
            </UFormField>
          </div>
        </div>
      </div>
    </UPageCard>

    <div
      v-if="settingsStore.isOperationFieldVisible('customs_broker_op_number') || settingsStore.isOperationFieldVisible('sim_number') || settingsStore.isOperationFieldVisible('supplier_purchase_order') || settingsStore.isOperationFieldVisible('notes')"
      class="grid grid-cols-1 items-start gap-3 lg:grid-cols-2"
    >
      <UPageCard
        v-if="settingsStore.isOperationFieldVisible('customs_broker_op_number') || settingsStore.isOperationFieldVisible('sim_number') || settingsStore.isOperationFieldVisible('supplier_purchase_order')"
        title="Datos aduaneros"
        description="Referencias del despachante y documentos de la operación."
        :ui="compactCardUi"
      >
        <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <UFormField
            v-if="settingsStore.isOperationFieldVisible('customs_broker_op_number')"
            label="N° OP Despachante"
            name="customs_broker_op_number"
          >
            <UInput v-model="form.customs_broker_op_number" placeholder="Ej: OP-2026-1234" class="w-full" />
          </UFormField>

          <UFormField
            v-if="settingsStore.isOperationFieldVisible('sim_number')"
            label="SIM"
            name="sim_number"
          >
            <UInput v-model="form.sim_number" placeholder="Solicitud de internación" class="w-full" />
          </UFormField>

          <UFormField
            v-if="settingsStore.isOperationFieldVisible('supplier_purchase_order')"
            label="Orden de compra proveedor"
            name="supplier_purchase_order"
            class="sm:col-span-2"
          >
            <UInput v-model="form.supplier_purchase_order" placeholder="Referencia OC proveedor" class="w-full" />
          </UFormField>
        </div>
      </UPageCard>

      <UPageCard
        v-if="settingsStore.isOperationFieldVisible('notes')"
        title="Notas"
        :ui="compactCardUi"
      >
        <UFormField name="notes">
          <UTextarea v-model="form.notes" placeholder="Notas adicionales sobre la operación..." class="w-full" :rows="2" />
        </UFormField>
      </UPageCard>
    </div>

    <UPageCard v-if="showInitialContainer" :ui="compactCardUi">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-container" class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold">Primer contenedor</h2>
              <p class="mt-1 text-sm text-muted">Podés cargarlo ahora para dejar lista la operación, o agregarlo más tarde.</p>
            </div>
          </div>
          <USwitch v-model="createInitialContainer" aria-label="Crear el primer contenedor junto con la operación" />
        </div>

        <div v-if="createInitialContainer" class="border-t border-default pt-4">
          <InitialContainerFields v-model="initialContainer" />
        </div>
      </div>
    </UPageCard>

    <div class="flex justify-end gap-2">
      <UButton label="Cancelar" variant="ghost" :to="cancelTo" />
      <UButton :label="resolvedSubmitLabel" color="primary" type="submit" :loading="loading" />
    </div>
  </UForm>
</template>
