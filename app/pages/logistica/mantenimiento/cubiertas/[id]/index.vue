<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import type { ButtonProps } from '@nuxt/ui'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import type { Tire } from '~/modulos/logistica/maintenance/types/maintenance.types'

const route = useRoute()
const router = useRouter()
const store = useMaintenanceStore()

const id = route.params.id as string
const loading = ref(true)
const activeTab = ref('info')

const tire = computed(() => store.currentTire)

// Status config
type BadgeColor = 'error' | 'neutral' | 'info' | 'success' | 'warning' | 'primary' | 'secondary'

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  IN_STOCK: { color: 'info', label: 'En Stock' },
  INSTALLED: { color: 'success', label: 'Instalada' },
  IN_REPAIR: { color: 'warning', label: 'En Reparo' },
  SCRAPPED: { color: 'error', label: 'Dada de Baja' },
  SOLD: { color: 'neutral', label: 'Vendida' }
}

const movementTypeConfig: Record<string, { color: BadgeColor; label: string }> = {
  PURCHASE: { color: 'info', label: 'Compra' },
  RECEIPT: { color: 'info', label: 'Recepción' },
  TRANSFER: { color: 'primary', label: 'Transferencia' },
  INSTALLATION: { color: 'success', label: 'Instalación' },
  REMOVAL: { color: 'warning', label: 'Retiro' },
  ROTATION: { color: 'secondary', label: 'Rotación' },
  REPAIR: { color: 'warning', label: 'Reparo' },
  RETREAD: { color: 'secondary', label: 'Renovado' },
  WAREHOUSE_ENTRY: { color: 'info', label: 'Entrada a Depósito' },
  WAREHOUSE_EXIT: { color: 'warning', label: 'Salida de Depósito' },
  SCRAP: { color: 'error', label: 'Baja' },
  SALE: { color: 'neutral', label: 'Venta' }
}

const statusBadge = computed(() => {
  const s = tire.value?.status ?? ''
  return statusConfig[s] ?? { color: 'neutral' as BadgeColor, label: s }
})

// Format helpers
const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

// Tabs
const tabs = [
  { key: 'info', label: 'Información' },
  { key: 'movements', label: 'Movimientos' },
  { key: 'positions', label: 'Historial Posiciones' }
]

// Action visibility
const canInstall = computed(() => tire.value?.status === 'IN_STOCK')
const canRemove = computed(() => tire.value?.status === 'INSTALLED')
const canRotate = computed(() => tire.value?.status === 'INSTALLED')
const canRepair = computed(() => tire.value?.status === 'INSTALLED' || tire.value?.status === 'IN_REPAIR')
const canScrap = computed(() => tire.value?.status !== 'SCRAPPED' && tire.value?.status !== 'SOLD')
const canSell = computed(() => tire.value?.status === 'IN_STOCK' || tire.value?.status === 'IN_REPAIR')

// Action modals
const showInstallModal = ref(false)
const showRemoveModal = ref(false)
const showRepairModal = ref(false)
const showScrapModal = ref(false)
const showSellModal = ref(false)

// --- FORM REFS (declared before computed/watch) ---
const installForm = reactive({ vehicle_id: '', position_id: '', odometer: 0, date: '' })
const removeForm = reactive({ to_location_type: 'WAREHOUSE', to_location_id: '', odometer: 0, reason: '', date: '' })
const repairForm = reactive({ supplier_id: '', cost: 0, description: '', odometer: 0, is_retread: false, date: '' })
const scrapForm = reactive({ reason: '', date: '' })
const sellForm = reactive({ customer_id: '', sale_price: 0, date: '' })

// --- SHARED LOOKUP DATA ---
const vehicles = ref<any[]>([])
const suppliers = ref<any[]>([])
const customers = ref<any[]>([])
const vehiclePositions = ref<any[]>([])
const loadingVehicles = ref(false)
const loadingSuppliers = ref(false)
const loadingCustomers = ref(false)
const loadingPositions = ref(false)

// --- SELECTED VALUES ---
const selectedInstallVehicle = ref<any>(null)
const selectedInstallPosition = ref<any>(null)
const selectedRepairSupplier = ref<any>(null)
const selectedSellCustomer = ref<any>(null)
const selectedRemoveDestination = ref<any>(null)

// --- COMPUTED ITEMS ---
const vehicleItems = computed(() =>
  vehicles.value.map((v: any) => ({
    value: v.id,
    label: `${v.plate}${v.brand ? ' — ' + v.brand : ''}${v.model ? ' ' + v.model : ''}`,
  }))
)

const positionItems = computed(() =>
  vehiclePositions.value.map((p: any) => ({
    value: p.id,
    label: `Pos #${p.position_number} — Eje ${p.axle} ${p.side === 'LEFT' ? 'Izq' : 'Der'}`,
  }))
)

const supplierItems = computed(() =>
  suppliers.value.map((s: any) => ({
    value: s.id,
    label: s.business_names ? `${s.business_names} — ${s.name}` : s.name,
  }))
)

const customerItems = computed(() =>
  customers.value.map((c: any) => ({
    value: c.id,
    label: c.business_names ? `${c.business_names} — ${c.name}` : c.name,
  }))
)

const removeLocationTypeItems = [
  { value: 'WAREHOUSE', label: 'Depósito' },
  { value: 'TIRE_SHOP', label: 'Gomería' },
  { value: 'SCRAP', label: 'Baja / Scrap' },
]

// --- WATCHS (form values → reactive form) ---
watch(selectedInstallVehicle, async (val) => {
  installForm.vehicle_id = val?.value ?? ''
  installForm.position_id = ''
  selectedInstallPosition.value = null
  if (val?.value) {
    loadingPositions.value = true
    try {
      const data = await $fetch<any[]>(`/api/logistica/maintenance/vehicles/${val.value}/tire-positions`)
      vehiclePositions.value = data
    } catch { vehiclePositions.value = [] } finally {
      loadingPositions.value = false
    }
  } else {
    vehiclePositions.value = []
  }
})

watch(selectedInstallPosition, (val) => {
  installForm.position_id = val?.value ?? ''
})

watch(selectedRepairSupplier, (val) => {
  repairForm.supplier_id = val?.value ?? ''
})

watch(selectedSellCustomer, (val) => {
  sellForm.customer_id = val?.value ?? ''
})

watch(selectedRemoveDestination, (val) => {
  removeForm.to_location_id = val?.value ?? ''
})

// --- FETCH DATA ---
async function fetchVehicles() {
  loadingVehicles.value = true
  try {
    vehicles.value = await $fetch<any[]>('/api/logistica/vehicles')
  } catch { /* */ } finally { loadingVehicles.value = false }
}

async function fetchSuppliers() {
  loadingSuppliers.value = true
  try {
    suppliers.value = await $fetch<any[]>('/api/logistica/master-data/business-parties', { params: { type: 'SUPPLIER' } })
  } catch { /* */ } finally { loadingSuppliers.value = false }
}

async function fetchCustomers() {
  loadingCustomers.value = true
  try {
    customers.value = await $fetch<any[]>('/api/logistica/master-data/business-parties', { params: { type: 'CUSTOMER' } })
  } catch { /* */ } finally { loadingCustomers.value = false }
}

onMounted(async () => {
  await Promise.all([
    store.fetchTire(id),
    fetchVehicles(),
    fetchSuppliers(),
    fetchCustomers(),
  ])
  loading.value = false
})

// --- ACTIONS ---
async function handleInstall() {
  if (!tire.value) return
  await store.installTire(tire.value.id, {
    vehicle_id: installForm.vehicle_id,
    position_id: installForm.position_id,
    odometer: installForm.odometer,
    date: installForm.date || undefined
  })
  showInstallModal.value = false
}

async function handleRemove() {
  if (!tire.value) return
  await store.removeTire(tire.value.id, {
    to_location_type: removeForm.to_location_type as any,
    to_location_id: removeForm.to_location_id || undefined,
    odometer: removeForm.odometer,
    reason: removeForm.reason || undefined,
    date: removeForm.date || undefined
  })
  showRemoveModal.value = false
}

async function handleRepair() {
  if (!tire.value) return
  await store.repairTire(tire.value.id, {
    supplier_id: repairForm.supplier_id,
    cost: repairForm.cost,
    description: repairForm.description,
    odometer: repairForm.odometer || undefined,
    is_retread: repairForm.is_retread,
    date: repairForm.date || undefined
  })
  showRepairModal.value = false
}

async function handleScrap() {
  if (!tire.value) return
  await store.scrapTire(tire.value.id, {
    reason: scrapForm.reason,
    date: scrapForm.date || undefined
  })
  showScrapModal.value = false
}

async function handleSell() {
  if (!tire.value) return
  await store.sellTire(tire.value.id, {
    customer_id: sellForm.customer_id,
    sale_price: sellForm.sale_price,
    date: sellForm.date || undefined
  })
  showSellModal.value = false
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24">
    <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
  </div>

  <UPage v-else-if="tire">
    <UPageHeader
      :title="`Cubierta ${tire.serial_number}`"
      :description="tire.product?.name ?? ''"
    />

    <div class="space-y-6 mt-4">
      <!-- Status badge -->
      <div class="flex items-center gap-3">
        <UBadge :color="statusBadge.color" variant="soft" size="lg">
          {{ statusBadge.label }}
        </UBadge>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2">
        <UButton v-if="canInstall" label="Instalar" icon="i-lucide-plus-circle" color="success" variant="outline" @click="showInstallModal = true" />
        <UButton v-if="canRemove" label="Retirar" icon="i-lucide-minus-circle" color="warning" variant="outline" @click="showRemoveModal = true" />
        <UButton v-if="canRotate" label="Rotar" icon="i-lucide-refresh-cw" color="primary" variant="outline" />
        <UButton v-if="canRepair" label="Reparar" icon="i-lucide-wrench" color="secondary" variant="outline" @click="showRepairModal = true" />
        <UButton v-if="canScrap" label="Dar de Baja" icon="i-lucide-trash-2" color="error" variant="outline" @click="showScrapModal = true" />
        <UButton v-if="canSell" label="Vender" icon="i-lucide-banknote" color="neutral" variant="outline" @click="showSellModal = true" />
      </div>

      <!-- Tabs -->
      <UTabs v-model="activeTab" :items="tabs" />

      <!-- Tab: Info -->
      <div v-if="activeTab === 'info'" class="space-y-6">
        <UCard>
          <template #header>
            <span class="font-medium text-sm">Datos Generales</span>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Serial</span>
              <span class="font-medium font-mono">{{ tire.serial_number }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Producto</span>
              <span class="font-medium">{{ tire.product?.name ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">SKU</span>
              <span class="font-medium">{{ tire.product?.sku ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Km Acumulados</span>
              <span class="font-medium">{{ tire.accumulated_km ? `${tire.accumulated_km.toLocaleString('es-AR')} km` : '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Días en Uso</span>
              <span class="font-medium">{{ tire.days_in_use ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Instalaciones</span>
              <span class="font-medium">{{ tire.installation_count ?? 0 }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Vehículos</span>
              <span class="font-medium">{{ tire.vehicle_count ?? 0 }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Reparos</span>
              <span class="font-medium">{{ tire.repair_count ?? 0 }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Renovados</span>
              <span class="font-medium">{{ tire.retread_count ?? 0 }}</span>
            </div>
          </div>
        </UCard>

        <UCard v-if="tire.current_vehicle || tire.current_position || tire.current_warehouse">
          <template #header>
            <span class="font-medium text-sm">Ubicación Actual</span>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div v-if="tire.current_vehicle" class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Vehículo</span>
              <span class="font-medium">{{ tire.current_vehicle.plate }}</span>
            </div>
            <div v-if="tire.current_position" class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Posición</span>
              <span class="font-medium">#{{ tire.current_position.position_number }} — Eje {{ tire.current_position.axle }} {{ tire.current_position.side === 'LEFT' ? 'Izq' : 'Der' }}</span>
            </div>
            <div v-if="tire.current_warehouse" class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Depósito</span>
              <span class="font-medium">{{ tire.current_warehouse.name }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <span class="font-medium text-sm">Datos de Compra</span>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Fecha Compra</span>
              <span class="font-medium">{{ formatDate(tire.purchase_date) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Proveedor</span>
              <span class="font-medium">{{ tire.purchase_supplier?.name ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Costo Unitario</span>
              <span class="font-medium">{{ formatCurrency(tire.purchase_unit_cost) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Doc. Compra</span>
              <span class="font-medium">{{ tire.purchase_document?.number ?? '—' }}</span>
            </div>
          </div>
          <div v-if="tire.total_repair_cost || tire.total_retread_cost" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Costo Total Reparos</span>
              <span class="font-medium">{{ formatCurrency(tire.total_repair_cost) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 uppercase tracking-wide">Costo Total Renovados</span>
              <span class="font-medium">{{ formatCurrency(tire.total_retread_cost) }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Tab: Movements -->
      <div v-if="activeTab === 'movements'">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">Movimientos</span>
              <UBadge variant="soft" color="neutral">{{ tire.movements?.length ?? 0 }}</UBadge>
            </div>
          </template>
          <div v-if="tire.movements?.length" class="space-y-3">
            <div v-for="movement in tire.movements" :key="movement.id" class="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <UBadge :color="movementTypeConfig[movement.movement_type]?.color ?? 'neutral'" variant="soft" size="xs">
                {{ movementTypeConfig[movement.movement_type]?.label ?? movement.movement_type }}
              </UBadge>
              <span class="flex-1 text-sm">
                {{ formatDate(movement.date) }}
                <span v-if="movement.vehicle" class="text-gray-400"> — {{ movement.vehicle.plate }}</span>
              </span>
              <span v-if="movement.odometer" class="text-xs text-gray-400">{{ movement.odometer.toLocaleString('es-AR') }} km</span>
            </div>
          </div>
          <UAlert v-else color="neutral" variant="soft" icon="i-lucide-arrow-left-right" title="Sin movimientos" description="No hay movimientos registrados para esta cubierta." />
        </UCard>
      </div>

      <!-- Tab: Position History -->
      <div v-if="activeTab === 'positions'">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">Historial de Posiciones</span>
              <UBadge variant="soft" color="neutral">{{ tire.positions_history?.length ?? 0 }}</UBadge>
            </div>
          </template>
          <div v-if="tire.positions_history?.length" class="space-y-3">
            <div v-for="pos in tire.positions_history" :key="pos.id" class="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <span class="text-sm font-medium">
                #{{ pos.position?.position_number ?? '—' }}
                <span class="text-gray-400">Eje {{ pos.position?.axle }} {{ pos.position?.side === 'LEFT' ? 'Izq' : 'Der' }}</span>
              </span>
              <span class="flex-1 text-sm">{{ pos.vehicle?.plate ?? '—' }}</span>
              <span class="text-xs text-gray-400">
                {{ formatDate(pos.installed_at) }} → {{ pos.removed_at ? formatDate(pos.removed_at) : 'Actual' }}
              </span>
            </div>
          </div>
          <UAlert v-else color="neutral" variant="soft" icon="i-lucide-map-pin" title="Sin historial" description="No hay historial de posiciones para esta cubierta." />
        </UCard>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- INSTALL MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showInstallModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Instalar Cubierta en Vehículo</h3>

          <UFormField label="Vehículo" required>
            <USelectMenu
              v-model="selectedInstallVehicle"
              :items="vehicleItems"
              placeholder="Buscar vehículo por patente..."
              searchable
              clear
              :loading="loadingVehicles"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Posición" required>
            <USelectMenu
              v-model="selectedInstallPosition"
              :items="positionItems"
              :placeholder="installForm.vehicle_id ? 'Seleccionar posición...' : 'Primero seleccione un vehículo'"
              searchable
              clear
              :loading="loadingPositions"
              :disabled="!installForm.vehicle_id"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Odómetro (km)">
            <UInput v-model.number="installForm.odometer" type="number" placeholder="Kilometraje actual" class="w-full" />
          </UFormField>

          <UFormField label="Fecha">
            <UInput v-model="installForm.date" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showInstallModal = false" />
            <UButton label="Instalar" color="success" :disabled="!installForm.vehicle_id || !installForm.position_id" @click="handleInstall" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- REMOVE MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showRemoveModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Retirar Cubierta</h3>

          <UFormField label="Destino" required>
            <USelect
              v-model="removeForm.to_location_type"
              :items="removeLocationTypeItems"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Ubicación Destino" v-if="removeForm.to_location_type === 'WAREHOUSE'">
            <UInput v-model="removeForm.to_location_id" placeholder="UUID del depósito (opcional)" class="w-full" />
          </UFormField>

          <UFormField label="Odómetro (km)">
            <UInput v-model.number="removeForm.odometer" type="number" placeholder="Kilometraje actual" class="w-full" />
          </UFormField>

          <UFormField label="Motivo">
            <UTextarea v-model="removeForm.reason" placeholder="Motivo del retiro" :rows="2" class="w-full" />
          </UFormField>

          <UFormField label="Fecha">
            <UInput v-model="removeForm.date" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showRemoveModal = false" />
            <UButton label="Retirar" color="warning" @click="handleRemove" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- REPAIR MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showRepairModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Reparar / Recapar Cubierta</h3>

          <UFormField label="Proveedor (Gomería)" required>
            <USelectMenu
              v-model="selectedRepairSupplier"
              :items="supplierItems"
              placeholder="Buscar proveedor..."
              searchable
              clear
              :loading="loadingSuppliers"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Costo">
            <UInput v-model.number="repairForm.cost" type="number" placeholder="0.00" class="w-full" />
          </UFormField>

          <UFormField label="Descripción" required>
            <UTextarea v-model="repairForm.description" placeholder="Detalle de la reparación" :rows="2" class="w-full" />
          </UFormField>

          <UFormField label="Odómetro (km)">
            <UInput v-model.number="repairForm.odometer" type="number" placeholder="Kilometraje actual" class="w-full" />
          </UFormField>

          <UCheckbox v-model="repairForm.is_retread" label="Es recapado (retread)" />

          <UFormField label="Fecha">
            <UInput v-model="repairForm.date" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showRepairModal = false" />
            <UButton label="Reparar" color="secondary" :disabled="!repairForm.supplier_id || !repairForm.description" @click="handleRepair" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- SCRAP MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showScrapModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Dar de Baja</h3>

          <UFormField label="Motivo" required>
            <UTextarea v-model="scrapForm.reason" placeholder="Motivo de la baja" :rows="2" class="w-full" />
          </UFormField>

          <UFormField label="Fecha">
            <UInput v-model="scrapForm.date" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showScrapModal = false" />
            <UButton label="Dar de Baja" color="error" :disabled="!scrapForm.reason" @click="handleScrap" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- SELL MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showSellModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Vender Cubierta</h3>

          <UFormField label="Cliente" required>
            <USelectMenu
              v-model="selectedSellCustomer"
              :items="customerItems"
              placeholder="Buscar cliente..."
              searchable
              clear
              :loading="loadingCustomers"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Precio de Venta">
            <UInput v-model.number="sellForm.sale_price" type="number" placeholder="0.00" class="w-full" />
          </UFormField>

          <UFormField label="Fecha">
            <UInput v-model="sellForm.date" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showSellModal = false" />
            <UButton label="Vender" :disabled="!sellForm.customer_id" @click="handleSell" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
