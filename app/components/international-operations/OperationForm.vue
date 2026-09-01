<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'
import type {
  CreateOperationInput,
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
  }>(),
  {
    initialData: () => ({}),
    loading: false,
    submitLabel: 'Crear operación',
    cancelTo: '/operaciones-internacionales'
  }
)

const emit = defineEmits<{
  submit: [payload: CreateOperationInput]
}>()

const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()

const locationsStore = useLocationsStore()
const { items: locations } = storeToRefs(locationsStore)
const { items: locationItems } = useLocations(locations)

onMounted(() => {
  initCurrencies()
  locationsStore.fetchAll()
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
  notes: '',
  ...props.initialData
})

const selectedOriginLocation = computed({
  get: () => locationItems.value.find((l) => l.value === form.value.origin_location_id) ?? null,
  set: (item: any) => {
    if (item) {
      const loc = locations.value.find((l) => l.id === item.value)
      form.value.origin_location_id = item.value
      form.value.origin_country = loc?.country ?? ''
      form.value.origin_location = loc?.city ?? loc?.address ?? ''
    } else {
      form.value.origin_location_id = undefined
      form.value.origin_country = ''
      form.value.origin_location = ''
    }
  }
})

const selectedDestinationLocation = computed({
  get: () => locationItems.value.find((l) => l.value === form.value.destination_location_id) ?? null,
  set: (item: any) => {
    if (item) {
      const loc = locations.value.find((l) => l.id === item.value)
      form.value.destination_location_id = item.value
      form.value.destination_country = loc?.country ?? ''
      form.value.destination_location = loc?.city ?? loc?.address ?? ''
    } else {
      form.value.destination_location_id = undefined
      form.value.destination_country = ''
      form.value.destination_location = ''
    }
  }
})

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
  emit('submit', { ...form.value })
}
</script>

<template>
  <UForm :state="form" @submit="onSubmit" class="space-y-6">
    <UPageCard>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Nombre descriptivo" name="name">
          <UInput v-model="form.name" placeholder="Ej: Importación-componentes-Shanghai" class="w-full" />
        </UFormField>

        <UFormField label="Tipo de operación" name="operation_type">
          <USelect v-model="form.operation_type" :items="operationTypes" class="w-full" />
        </UFormField>

        <UFormField label="Medio de transporte" name="transport_type">
          <USelect v-model="form.transport_type" :items="transportTypes" class="w-full" />
        </UFormField>

        <UFormField label="Moneda" name="currency_code">
          <USelect v-model="form.currency_code" :items="currencyOptions" placeholder="Seleccionar moneda" class="w-full" />
        </UFormField>

        <UFormField label="Incoterm" name="incoterm">
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
      </div>
    </UPageCard>

    <UPageCard title="Origen">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Ubicación de origen" name="origin_location_id">
          <USelectMenu
            v-model="selectedOriginLocation"
            :items="locationItems"
            placeholder="Seleccionar ubicación de origen"
            searchable
            clear
            class="w-full"
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
    </UPageCard>

    <UPageCard title="Destino">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Ubicación de destino" name="destination_location_id">
          <USelectMenu
            v-model="selectedDestinationLocation"
            :items="locationItems"
            placeholder="Seleccionar ubicación de destino"
            searchable
            clear
            class="w-full"
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
    </UPageCard>

    <UPageCard title="Fechas estimadas">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Salida estimada" name="estimated_departure_date">
          <UInput v-model="form.estimated_departure_date" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Arribo estimado (ETA)" name="estimated_arrival_date">
          <UInput v-model="form.estimated_arrival_date" type="date" class="w-full" />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard title="Notas">
      <UFormField name="notes">
        <UTextarea v-model="form.notes" placeholder="Notas adicionales sobre la operación..." class="w-full" :rows="3" />
      </UFormField>
    </UPageCard>

    <div class="flex justify-end gap-2">
      <UButton label="Cancelar" variant="ghost" :to="cancelTo" />
      <UButton :label="submitLabel" color="primary" type="submit" :loading="loading" />
    </div>
  </UForm>
</template>
