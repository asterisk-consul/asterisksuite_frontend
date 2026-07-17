<script setup lang="ts">
definePageMeta({
  layout: 'fabricacion',
  middleware: ['auth']
})

import { useTripsStore } from '~/modulos/logistica/transport/trips/trips.store'
import { useChoferesStore } from '~/modulos/logistica/transport/drivers/choferes.store'
import { useVehicleCombinationsStore } from '~/modulos/logistica/transport/vehicles-combinations/vehicle-combinations.store'
import { useDispatchOrdersStore } from '~/modulos/logistica/documents/dispatch-orders/store/dispatch-orders.store'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'

const tripsStore = useTripsStore()
const driversStore = useChoferesStore()
const vehiclesStore = useVehicleCombinationsStore()
const dispatchStore = useDispatchOrdersStore()
const warehousesStore = useDepositosStore()

const loading = ref(true)

onMounted(async () => {
  try {
    await Promise.allSettled([
      tripsStore.fetchAll().catch(() => {}),
      driversStore.fetchAll().catch(() => {}),
      vehiclesStore.fetchAll().catch(() => {}),
      dispatchStore.fetchAll().catch(() => {}),
      warehousesStore.fetchAll().catch(() => {})
    ])
  } finally {
    loading.value = false
  }
})

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(num)
}

const TRIP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'neutral' },
  IN_PROGRESS: { label: 'En curso', color: 'info' },
  COMPLETED: { label: 'Completado', color: 'success' },
  CANCELLED: { label: 'Cancelado', color: 'error' },
  ON_HOLD: { label: 'En espera', color: 'warning' }
}

const DISPATCH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' },
  PENDING: { label: 'Pendiente', color: 'warning' },
  CONFIRMED: { label: 'Confirmado', color: 'info' },
  IN_TRANSIT: { label: 'En tránsito', color: 'primary' },
  DELIVERED: { label: 'Entregado', color: 'success' },
  CANCELLED: { label: 'Cancelado', color: 'error' }
}

const trips = computed(() => tripsStore.items ?? [])
const drivers = computed(() => driversStore.drivers ?? [])
const vehicles = computed(() => vehiclesStore.items ?? [])
const dispatchOrders = computed(() => dispatchStore.dispatchOrders ?? [])
const warehouses = computed(() => warehousesStore.warehouses ?? [])

const activeTrips = computed(() => trips.value.filter((t) => t.status === 'IN_PROGRESS'))
const pendingTrips = computed(() => trips.value.filter((t) => t.status === 'PENDING'))
const completedTrips = computed(() => trips.value.filter((t) => t.status === 'COMPLETED'))

const activeDrivers = computed(() => drivers.value.filter((d) => d.active))
const inactiveDrivers = computed(() => drivers.value.filter((d) => !d.active))

const activeVehicles = computed(() => vehicles.value.filter((v) => v.active !== false))
const pendingOrders = computed(() => dispatchOrders.value.filter((o) => o.status === 'PENDING' || o.status === 'DRAFT'))
const confirmedOrders = computed(() => dispatchOrders.value.filter((o) => o.status === 'CONFIRMED'))
const inTransitOrders = computed(() => dispatchOrders.value.filter((o) => o.status === 'IN_TRANSIT'))

const statCards = computed(() => [
  {
    label: 'Viajes activos',
    value: activeTrips.value.length,
    sub: `${trips.value.length} total`,
    icon: 'i-lucide-truck',
    color: 'primary' as const,
    to: '/logistica/viajes'
  },
  {
    label: 'Choferes disponibles',
    value: activeDrivers.value.length,
    sub: `${drivers.value.length} total`,
    icon: 'i-lucide-user',
    color: 'success' as const,
    to: '/logistica/viajes/drivers'
  },
  {
    label: 'Vehículos en flota',
    value: activeVehicles.value.length,
    sub: `${vehicles.value.length} total`,
    icon: 'i-lucide-car',
    color: 'info' as const,
    to: '/logistica/vehicles-combinations'
  },
  {
    label: 'Órdenes pendientes',
    value: pendingOrders.value.length,
    sub: `${dispatchOrders.value.length} total`,
    icon: 'i-lucide-clipboard-list',
    color: 'warning' as const,
    to: '/logistica/viajes/dispatch-orders'
  }
])

const tripStatusData = computed(() => {
  const map = new Map<string, number>()
  for (const t of trips.value) {
    map.set(t.status, (map.get(t.status) || 0) + 1)
  }
  return Array.from(map.entries()).map(([status, count]) => ({
    name: TRIP_STATUS_CONFIG[status]?.label ?? status,
    value: count,
    color: TRIP_STATUS_CONFIG[status]?.color ?? 'neutral'
  }))
})

const tripStatusPie = computed(() => {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: tripStatusData.value.map((d, i) => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }
    ]
  }
})

const dispatchPipeline = computed(() => {
  const map = new Map<string, number>()
  for (const o of dispatchOrders.value) {
    map.set(o.status, (map.get(o.status) || 0) + 1)
  }
  const entries = Array.from(map.entries())
    .map(([status, count]) => ({
      status,
      label: DISPATCH_STATUS_CONFIG[status]?.label ?? status,
      count,
      color: DISPATCH_STATUS_CONFIG[status]?.color ?? 'neutral'
    }))
    .sort((a, b) => {
      const order = ['DRAFT', 'PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })
  return entries
})

const recentTrips = computed(() =>
  [...trips.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
)

const quickActions = [
  { label: 'Nuevo viaje', icon: 'i-lucide-truck', to: '/logistica/viajes/create', color: 'primary' as const },
  {
    label: 'Nueva orden',
    icon: 'i-lucide-clipboard-plus',
    to: '/logistica/viajes/dispatch-orders/create',
    color: 'warning' as const
  },
  {
    label: 'Nuevo corredor',
    icon: 'i-lucide-map-pin',
    to: '/logistica/viajes/corridors/create',
    color: 'info' as const
  },
  {
    label: 'Reporte choferes',
    icon: 'i-lucide-bar-chart-3',
    to: '/logistica/reportes/choferes',
    color: 'success' as const
  }
]

const tripStatusLabel = (status: string) => TRIP_STATUS_CONFIG[status]?.label ?? status
const tripStatusColor = (status: string) => TRIP_STATUS_CONFIG[status]?.color ?? 'neutral'
</script>

<template>
  <UPage class="space-y-6 px-4">
    <UPageHeader title="Dashboard Logística" description="Resumen de operaciones de transporte y depósito" />

    <!-- STAT CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 py-4">
      <NuxtLink v-for="stat in statCards" :key="stat.label" :to="stat.to" class="block">
        <UPageCard
          variant="subtle"
          class="hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-xl shrink-0"
              :class="{
                'bg-primary/10 text-primary': stat.color === 'primary',
                'bg-success/10 text-success': stat.color === 'success',
                'bg-warning/10 text-warning': stat.color === 'warning',
                'bg-info/10 text-info': stat.color === 'info'
              }"
            >
              <UIcon :name="stat.icon" class="size-6" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted font-medium uppercase tracking-wide">{{ stat.label }}</p>
              <p class="text-2xl font-bold mt-0.5">{{ stat.value }}</p>
              <p class="text-xs text-muted mt-0.5">{{ stat.sub }}</p>
            </div>
          </div>
        </UPageCard>
      </NuxtLink>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="flex items-center gap-3">
      <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to">
        <UButton :label="action.label" :icon="action.icon" :color="action.color" variant="outline" size="sm" />
      </NuxtLink>
    </div>

    <!-- CHARTS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      <!-- TRIP STATUS PIE -->
      <UPageCard variant="subtle">
        <template #header>
          <h3 class="text-sm font-semibold">Estado de viajes</h3>
        </template>
        <div v-if="trips.length === 0" class="text-center py-8 text-muted text-sm">No hay viajes registrados</div>
        <ClientOnly v-else>
          <VChart :option="tripStatusPie" :style="{ height: '280px', width: '100%' }" autoresize />
        </ClientOnly>
      </UPageCard>

      <!-- DISPATCH PIPELINE -->
      <UPageCard variant="subtle">
        <template #header>
          <h3 class="text-sm font-semibold">Pipeline de órdenes</h3>
        </template>
        <div v-if="dispatchOrders.length === 0" class="text-center py-8 text-muted text-sm">
          No hay órdenes registradas
        </div>
        <div v-else class="space-y-3 py-2">
          <div v-for="item in dispatchPipeline" :key="item.status" class="flex items-center gap-3">
            <UBadge :label="item.label" :color="item.color" variant="soft" size="xs" class="w-24 justify-center" />
            <div class="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="{
                  'bg-neutral-400': item.color === 'neutral',
                  'bg-warning': item.color === 'warning',
                  'bg-info': item.color === 'info',
                  'bg-primary': item.color === 'primary',
                  'bg-success': item.color === 'success',
                  'bg-error': item.color === 'error'
                }"
                :style="{ width: `${(item.count / dispatchOrders.length) * 100}%` }"
              />
            </div>
            <span class="text-sm font-semibold w-8 text-right">{{ item.count }}</span>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- RECENT TRIPS + FLEET STATUS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      <!-- RECENT TRIPS -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Últimos viajes</h3>
            <NuxtLink to="/logistica/viajes">
              <UButton label="Ver todos" variant="ghost" size="xs" />
            </NuxtLink>
          </div>
        </template>
        <div v-if="recentTrips.length === 0" class="text-center py-8 text-muted text-sm">No hay viajes</div>
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="trip in recentTrips"
            :key="trip.id"
            :to="`/logistica/viajes/${trip.id}`"
            class="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-truck" class="size-4 text-primary" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ trip.reference_number ?? `Viaje #${trip.id.slice(0, 8)}` }}
                </p>
                <p class="text-xs text-muted truncate">
                  {{ trip.locations_trips_origin_location_idTolocations?.name ?? 'Origen' }}
                  →
                  {{ trip.locations_trips_destination_location_idTolocations?.name ?? 'Destino' }}
                </p>
              </div>
            </div>
            <UBadge
              :label="tripStatusLabel(trip.status)"
              :color="tripStatusColor(trip.status)"
              variant="soft"
              size="xs"
            />
          </NuxtLink>
        </div>
      </UPageCard>

      <!-- FLEET STATUS -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Flota y choferes</h3>
            <NuxtLink to="/logistica/vehicles-combinations">
              <UButton label="Ver flota" variant="ghost" size="xs" />
            </NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-2 gap-4 py-2">
          <div class="text-center p-4 rounded-lg border border-default">
            <p class="text-2xl font-bold text-primary">{{ activeDrivers.length }}</p>
            <p class="text-xs text-muted mt-1">Choferes activos</p>
          </div>
          <div class="text-center p-4 rounded-lg border border-default">
            <p class="text-2xl font-bold text-info">{{ activeVehicles.length }}</p>
            <p class="text-xs text-muted mt-1">Vehículos activos</p>
          </div>
          <div class="text-center p-4 rounded-lg border border-default">
            <p class="text-2xl font-bold text-warning">{{ activeTrips.length }}</p>
            <p class="text-xs text-muted mt-1">Viajes en curso</p>
          </div>
          <div class="text-center p-4 rounded-lg border border-default">
            <p class="text-2xl font-bold text-success">{{ warehouses.length }}</p>
            <p class="text-xs text-muted mt-1">Depósitos</p>
          </div>
        </div>
      </UPageCard>
    </div>
  </UPage>
</template>
