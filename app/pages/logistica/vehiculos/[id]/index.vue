<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const id = route.params.id as string

const loading = ref(true)
const vehicle = ref<any>(null)
const tirePositions = ref<any[]>([])
const axleCount = ref(2)

async function fetchVehicle() {
  try {
    vehicle.value = await $fetch(`/api/logistica/vehicles/${id}`)
  } catch { /* */ }
}

async function fetchTirePositions() {
  try {
    tirePositions.value = await $fetch(`/api/logistica/maintenance/vehicles/${id}/tire-positions`)
  } catch { /* */ }
}

onMounted(async () => {
  await Promise.all([fetchVehicle(), fetchTirePositions()])
  if (vehicle.value?.type === 'SEMI') axleCount.value = 3
  loading.value = false
})

function handleTireClick(tireId: string) {
  navigateTo(`/logistica/mantenimiento/cubiertas/${tireId}`)
}

function handlePositionClick(positionId: string) {
  navigateTo(`/logistica/mantenimiento/cubiertas/nueva?vehicle_id=${id}&position_id=${positionId}`)
}

const installedCount = computed(() =>
  tirePositions.value.filter((p: any) => p.tires?.length > 0).length
)

const totalPositions = computed(() => tirePositions.value.length)

const totalKm = computed(() =>
  tirePositions.value.reduce((sum: number, p: any) => {
    const t = p.tires?.[0]
    return sum + (t?.accumulated_km ?? 0)
  }, 0)
)

const typeBadgeColor = computed(() => vehicle.value?.type === 'CAMION' ? 'primary' : 'warning')
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24">
    <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
  </div>

  <UPage v-else-if="vehicle">
    <UPageHeader
      :title="vehicle.plate"
      :description="`${vehicle.brand ?? ''} ${vehicle.model ?? ''} ${vehicle.year ?? ''}`"
    >
      <template #headline>
        <UBadge :color="typeBadgeColor" variant="soft">
          {{ vehicle.type === 'CAMION' ? 'Camión' : 'Semi' }}
        </UBadge>
        <UBadge v-if="vehicle.refrigeration" color="info" variant="soft">
          Refrigerado
        </UBadge>
        <UBadge :color="vehicle.active ? 'success' : 'error'" variant="soft">
          {{ vehicle.active ? 'Activo' : 'Inactivo' }}
        </UBadge>
      </template>
    </UPageHeader>

    <div class="space-y-6 mt-4">
      <!-- ═══ VEHICLE INFO ═══ -->
      <UCard>
        <template #header>
          <span class="font-medium text-sm">Información del Vehículo</span>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Patente</span>
            <span class="font-medium font-mono text-lg">{{ vehicle.plate }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Marca</span>
            <span class="font-medium">{{ vehicle.brand ?? '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Modelo</span>
            <span class="font-medium">{{ vehicle.model ?? '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Año</span>
            <span class="font-medium">{{ vehicle.year ?? '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Peso Máx.</span>
            <span class="font-medium">{{ vehicle.max_weight ? `${vehicle.max_weight} kg` : '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Volumen Máx.</span>
            <span class="font-medium">{{ vehicle.max_volume ? `${vehicle.max_volume} m³` : '—' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Tipo</span>
            <span class="font-medium">{{ vehicle.type === 'CAMION' ? 'Camión (Tractor)' : 'Semi (Acoplado)' }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-gray-400 uppercase tracking-wide">Refrigeración</span>
            <span class="font-medium">{{ vehicle.refrigeration ? 'Sí' : 'No' }}</span>
          </div>
        </div>
      </UCard>

      <!-- ═══ TIRE MAP ═══ -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Mapa de Cubiertas</span>
            <div class="flex items-center gap-3">
              <USelect
                v-model="axleCount"
                :items="vehicle.type === 'CAMION'
                  ? [{ value: 2, label: '2 Ejes' }, { value: 3, label: '3 Ejes' }]
                  : [{ value: 2, label: '2 Ejes' }, { value: 3, label: '3 Ejes' }]"
                size="xs"
              />
            </div>
          </div>
        </template>

        <!-- Stats bar -->
        <div class="flex gap-6 mb-4 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-green-500" />
            <span>Instalada</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Reparación</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-gray-300" />
            <span>Vacía</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500" />
            <span>Baja</span>
          </div>
        </div>

        <VehicleTireMap
          :vehicle-type="vehicle.type"
          :positions="tirePositions"
          :axle-count="axleCount"
          @tire-click="handleTireClick"
          @position-click="handlePositionClick"
        />

        <!-- Summary stats -->
        <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-center">
          <div>
            <div class="text-lg font-semibold">{{ installedCount }}/{{ totalPositions }}</div>
            <div class="text-xs text-gray-400">Cubiertas Instaladas</div>
          </div>
          <div>
            <div class="text-lg font-semibold">{{ totalKm.toLocaleString('es-AR') }} km</div>
            <div class="text-xs text-gray-400">Km Total Acumulado</div>
          </div>
          <div>
            <div class="text-lg font-semibold">{{ axleCount }}</div>
            <div class="text-xs text-gray-400">Ejes Configurados</div>
          </div>
        </div>
      </UCard>

      <!-- ═══ DOCUMENTS ═══ -->
      <UCard v-if="vehicle.vehicleDocuments?.length">
        <template #header>
          <span class="font-medium text-sm">Documentos</span>
        </template>
        <div class="space-y-2">
          <div v-for="doc in vehicle.vehicleDocuments" :key="doc.id"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
            <div>
              <span class="font-medium text-sm">{{ doc.transport_document_types?.name ?? 'Documento' }}</span>
            </div>
            <span class="text-sm text-gray-400">
              Vence: {{ doc.expiration_date ? new Date(doc.expiration_date).toLocaleDateString('es-AR') : 'Sin fecha' }}
            </span>
          </div>
        </div>
      </UCard>
    </div>
  </UPage>
</template>
