<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import type { ContainerEvent, ContainerEventType, ContainerStatus, ContainerType, CreateEventInput } from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const containerId = route.params.containerId as string
const toast = useToast()

const {
  findOneContainer,
  updateContainer,
  deliverContainer,
  createEvent,
  removeEvent,
  containerStatusColor,
  containerStatusLabel,
  containerStatusOptions,
  containerStatusDescriptions,
  containerTypeLabel,
  formatCurrency,
  formatDate
} = useInternationalOperations()

const depositosStore = useDepositosStore()
const { warehouses } = storeToRefs(depositosStore)

const container = ref<any>(null)
const loading = ref(true)

// ── Documentos de mercadería asociados ──
const merchandiseDocs = computed(() => {
  const docs = container.value?.container_documents ?? []
  return docs.filter((d: any) => !d.expense_type || d.expense_type === 'MERCHANDISE')
})

const productRows = computed(() => {
  const rows: { docLabel: string; docId: string; productName: string; sku?: string; quantity: number; price?: number }[] = []
  for (const rel of merchandiseDocs.value) {
    const doc = rel.document
    if (!doc) continue
    const docLabel = `${doc.document_types?.description ?? doc.document_types?.code ?? 'Documento'}${doc.number ? ` #${doc.number}` : ''}`
    for (const item of doc.document_items ?? []) {
      rows.push({
        docLabel,
        docId: doc.id,
        productName: item.products?.name ?? item.product_id ?? '—',
        sku: item.products?.sku,
        quantity: Number(item.quantity ?? 0),
        price: item.price != null ? Number(item.price) : undefined
      })
    }
  }
  return rows
})

const totalUnits = computed(() => productRows.value.reduce((sum, r) => sum + r.quantity, 0))

// ── Entrega de contenedor (transferencia desde tránsito) ──
const showDeliverModal = ref(false)
const deliverWarehouseId = ref<string | undefined>(undefined)
const delivering = ref(false)

const destinationOptions = computed(() =>
  (warehouses.value ?? [])
    .filter((w: any) => w.active && !w.is_virtual && w.id !== container.value?.transit_warehouse_id)
    .map((w: any) => ({ label: w.name, value: w.id }))
)

const openDeliverModal = async () => {
  await depositosStore.fetchAll().catch(() => {})
  deliverWarehouseId.value = destinationOptions.value[0]?.value
  showDeliverModal.value = true
}

const handleDeliver = async () => {
  if (!deliverWarehouseId.value) {
    toast.add({ title: 'Seleccioná el depósito de destino', color: 'warning' })
    return
  }
  delivering.value = true
  try {
    await deliverContainer(containerId, deliverWarehouseId.value)
    container.value = await findOneContainer(containerId)
    showDeliverModal.value = false
    toast.add({ title: 'Contenedor entregado', description: 'El stock en tránsito se transfirió al depósito de destino.', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'No se pudo entregar', description: err?.data?.message, color: 'error' })
  } finally {
    delivering.value = false
  }
}

const showEventForm = ref(false)
const eventForm = ref<CreateEventInput>({
  event_type: 'LOADED_AT_ORIGIN' as ContainerEventType,
  event_date: new Date().toISOString().split('T')[0]!,
  location_text: '',
  description: ''
})

const eventTypes: { label: string; value: ContainerEventType }[] = [
  { label: 'Cargado en origen', value: 'LOADED_AT_ORIGIN' },
  { label: 'Partió de origen', value: 'DEPARTED_ORIGIN' },
  { label: 'Embarcado', value: 'SHIPPED' },
  { label: 'En tránsito', value: 'IN_TRANSIT' },
  { label: 'Arribó al puerto', value: 'ARRIVED_AT_PORT' },
  { label: 'Aduana', value: 'CUSTOMS' },
  { label: 'Liberado', value: 'RELEASED' },
  { label: 'Transporte interno', value: 'INLAND_TRANSPORT' },
  { label: 'Arribó al depósito', value: 'ARRIVED_AT_WAREHOUSE' },
  { label: 'Entregado', value: 'DELIVERED' }
]

const containerStatusItems = computed(() =>
  containerStatusOptions.value.map((s) => ({
    label: s.value === container.value?.status ? `${s.label} (actual)` : s.label,
    disabled: s.value === container.value?.status,
    onSelect: () => handleStatusChange(s.value as ContainerStatus)
  }))
)

const handleStatusChange = async (status: ContainerStatus) => {
  const current = container.value?.status
  if (current && current !== status && confirm(`¿Cambiar estado de "${containerStatusLabel(current)}" a "${containerStatusLabel(status)}"?`)) {
    await updateContainer(containerId, { status })
    container.value = await findOneContainer(containerId)
  }
}

onMounted(async () => {
  try {
    container.value = await findOneContainer(containerId)
  } finally {
    loading.value = false
  }
})

const handleCreateEvent = async () => {
  await createEvent(containerId, eventForm.value)
  container.value = await findOneContainer(containerId)
  showEventForm.value = false
  eventForm.value = {
    event_type: 'LOADED_AT_ORIGIN' as ContainerEventType,
    event_date: new Date().toISOString().split('T')[0]!,
    location_text: '',
    description: ''
  }
}

const handleRemoveEvent = async (eventId: string) => {
  if (confirm('¿Eliminar este evento?')) {
    await removeEvent(eventId)
    container.value = await findOneContainer(containerId)
  }
}
</script>

<template>
  <UPage class="space-y-6">
    <AppPageHeader v-if="container" :title="container.container_number" :description="`Contenedor — ${container.operation?.number ?? ''}`">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" :to="`/operaciones-internacionales/${container.operation?.id}`" />
        <UButton
          label="Editar"
          variant="outline"
          icon="i-lucide-pencil"
          :to="`/operaciones-internacionales/${container.operation?.id}/containers/${containerId}/edit`"
        />
      </template>
    </AppPageHeader>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-48 w-full" />
    </div>

    <template v-if="container">
      <div class="flex flex-wrap gap-2 items-center">
        <UBadge :label="containerStatusLabel(container.status)" :color="containerStatusColor(container.status) as any" size="lg" />
        <span class="text-muted text-sm" v-if="container.container_type">{{ containerTypeLabel(container.container_type as ContainerType) }}</span>
      </div>

      <div class="flex gap-2 my-4 items-center flex-wrap">
        <UDropdownMenu :items="containerStatusItems">
          <UButton label="Cambiar estado" icon="i-lucide-refresh-cw" variant="outline" size="sm" />
        </UDropdownMenu>
        <UButton
          v-if="container.transit_warehouse_id && container.status !== 'DELIVERED' && container.status !== 'CLOSED'"
          label="Entregar stock"
          icon="i-lucide-package-check"
          color="primary"
          variant="solid"
          size="sm"
          @click="openDeliverModal"
        />
        <UPopover>
          <UButton icon="i-lucide-help-circle" size="xs" variant="ghost" aria-label="Estados" />
          <template #content>
            <div class="p-4 w-80 space-y-2.5">
              <p class="text-xs font-semibold text-muted uppercase tracking-wide">Estados del contenedor</p>
              <div v-for="(d, key) in containerStatusDescriptions" :key="key">
                <p class="text-xs font-medium">{{ d.label }}</p>
                <p class="text-xs text-muted">{{ d.description }}</p>
              </div>
            </div>
          </template>
        </UPopover>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UPageCard title="Información del Contenedor">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-muted">Número</p>
              <p class="font-medium">{{ container.container_number }}</p>
            </div>
            <div>
              <p class="text-muted">Tipo</p>
              <p class="font-medium">{{ containerTypeLabel(container.container_type as ContainerType) }}</p>
            </div>
            <div v-if="container.seal_number">
              <p class="text-muted">Sello</p>
              <p class="font-medium">{{ container.seal_number }}</p>
            </div>
            <div v-if="container.booking_number">
              <p class="text-muted">Booking</p>
              <p class="font-medium">{{ container.booking_number }}</p>
            </div>
            <div v-if="container.bill_of_lading">
              <p class="text-muted">Bill of Lading</p>
              <p class="font-medium">{{ container.bill_of_lading }}</p>
            </div>
            <div v-if="container.vessel_name">
              <p class="text-muted">Buque</p>
              <p class="font-medium">{{ container.vessel_name }}</p>
            </div>
            <div v-if="container.voyage_number">
              <p class="text-muted">Viaje</p>
              <p class="font-medium">{{ container.voyage_number }}</p>
            </div>
            <div v-if="container.weight">
              <p class="text-muted">Peso</p>
              <p class="font-medium">{{ container.weight }} kg</p>
            </div>
            <div v-if="container.volume">
              <p class="text-muted">Volumen</p>
              <p class="font-medium">{{ container.volume }} m³</p>
            </div>
          </div>
        </UPageCard>

        <UPageCard title="Fechas">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-muted">Salida estimada</p>
              <p class="font-medium">{{ formatDate(container.estimated_departure_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Salida real</p>
              <p class="font-medium">{{ formatDate(container.actual_departure_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Arribo estimado</p>
              <p class="font-medium">{{ formatDate(container.estimated_arrival_date) }}</p>
            </div>
            <div>
              <p class="text-muted">Arribo real</p>
              <p class="font-medium">{{ formatDate(container.actual_arrival_date) }}</p>
            </div>
          </div>
        </UPageCard>
      </div>

      <UPageCard v-if="productRows.length" title="Productos en este contenedor">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-medium">Productos en este contenedor</span>
            <UBadge :label="`${productRows.length} ítems · ${totalUnits} uds`" color="neutral" variant="subtle" size="sm" />
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted border-b border-default">
                <th class="py-2 pr-4 font-medium">Documento</th>
                <th class="py-2 pr-4 font-medium">Producto</th>
                <th class="py-2 pr-4 font-medium">SKU</th>
                <th class="py-2 pr-4 font-medium text-right">Cantidad</th>
                <th class="py-2 font-medium text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in productRows" :key="`${row.docId}-${idx}`" class="border-b border-default last:border-0">
                <td class="py-2 pr-4 text-muted">{{ row.docLabel }}</td>
                <td class="py-2 pr-4 font-medium">{{ row.productName }}</td>
                <td class="py-2 pr-4 font-mono text-xs">{{ row.sku ?? '—' }}</td>
                <td class="py-2 pr-4 text-right">{{ row.quantity }}</td>
                <td class="py-2 text-right">{{ row.price != null ? row.price : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="container.transit_warehouse_id" class="mt-3 text-xs text-muted flex items-center gap-1.5">
          <UIcon name="i-lucide-info" class="size-3.5" />
          Al confirmar los documentos de mercadería, el stock ingresa al almacén de tránsito de este contenedor.
        </p>
      </UPageCard>

      <UPageCard title="Timeline">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-medium">Timeline</span>
            <UButton label="Agregar evento" icon="i-lucide-plus" size="xs" variant="outline" @click="() => { showEventForm = !showEventForm }" />
          </div>
        </template>

        <div v-if="showEventForm" class="mb-6 p-4 border rounded-lg bg-muted/30 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField label="Tipo de evento">
              <USelect v-model="eventForm.event_type" :items="eventTypes" class="w-full" />
            </UFormField>
            <UFormField label="Fecha">
              <UInput v-model="eventForm.event_date" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Ubicación">
              <UInput v-model="eventForm.location_text" placeholder="Puerto, depósito..." class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Descripción">
            <UInput v-model="eventForm.description" placeholder="Descripción del evento..." class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="ghost" size="sm" @click="() => { showEventForm = false }" />
            <UButton label="Guardar" color="primary" size="sm" @click="handleCreateEvent" />
          </div>
        </div>

        <div v-if="container.events?.length" class="relative ml-3 border-l-2 border-muted">
          <div v-for="event in container.events" :key="event.id" class="relative pl-6 pb-6 last:pb-0">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-sm">{{ event.event_type.replace(/_/g, ' ') }}</p>
                <p v-if="event.location_text" class="text-muted text-xs">{{ event.location_text }}</p>
                <p v-if="event.description" class="text-xs mt-1">{{ event.description }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted text-xs">{{ formatDate(event.event_date) }}</span>
                <UButton color="error" variant="ghost" icon="i-lucide-trash" size="xs" @click="handleRemoveEvent(event.id)" />
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm">No hay eventos registrados.</p>
      </UPageCard>
    </template>

    <UModal v-model:open="showDeliverModal" title="Transferir stock en tránsito">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Contenedor <span class="font-mono font-bold text-default">{{ container?.container_number }}</span>
            · Operación <span class="font-mono text-default">{{ container?.operation?.number }}</span>
          </p>
          <UFormField label="Depósito de destino" name="destination_warehouse_id" required>
            <USelect
              v-model="deliverWarehouseId"
              :items="destinationOptions"
              placeholder="Seleccionar depósito"
              class="w-full"
            />
          </UFormField>
          <div v-if="productRows.length" class="rounded-lg border border-default p-3 space-y-1.5 max-h-48 overflow-y-auto">
            <p class="text-xs font-semibold text-muted uppercase tracking-wide">Productos a transferir</p>
            <div v-for="(row, idx) in productRows" :key="`deliver-${idx}`" class="flex justify-between text-sm">
              <span>{{ row.productName }}</span>
              <span class="font-medium">×{{ row.quantity }} uds</span>
            </div>
          </div>
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            title="El contenedor pasará a estado Entregado"
            description="Todo el stock del almacén de tránsito se moverá al depósito elegido."
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="() => { showDeliverModal = false }" />
          <UButton label="Confirmar entrega" color="primary" icon="i-lucide-package-check" :loading="delivering" @click="handleDeliver" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
