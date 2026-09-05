<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { storeToRefs } from 'pinia'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import type { DashboardOverview, UpcomingMaintenance, TireStats } from '~/modulos/logistica/maintenance/types/maintenance.types'

/* ---------------------------------------
   STATE
--------------------------------------- */
const store = useMaintenanceStore()
const { loading, dashboard, upcomingMaintenances } = storeToRefs(store)

const tireStats = ref<TireStats | null>(null)
const loadingTireStats = ref(false)

// Fetch tire stats from dashboard/tires
async function fetchTireStats() {
  loadingTireStats.value = true
  try {
    const result = await $fetch<TireStats>('/api/logistica/maintenance/dashboard/tires')
    tireStats.value = result
  } catch {
    // silently fail
  } finally {
    loadingTireStats.value = false
  }
}

/* ---------------------------------------
   CONFIG
--------------------------------------- */
type BadgeColor = 'error' | 'neutral' | 'info' | 'success' | 'warning' | 'primary' | 'secondary'

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  PENDING: { color: 'warning', label: 'Pendiente' },
  SCHEDULED: { color: 'info', label: 'Programada' },
  IN_PROGRESS: { color: 'primary', label: 'En Progreso' },
  COMPLETED: { color: 'success', label: 'Completada' },
  CANCELLED: { color: 'error', label: 'Cancelada' }
}

const priorityConfig: Record<string, { color: BadgeColor; label: string }> = {
  CRITICAL: { color: 'error', label: 'Crítica' },
  HIGH: { color: 'warning', label: 'Alta' },
  MEDIUM: { color: 'info', label: 'Media' },
  LOW: { color: 'neutral', label: 'Baja' }
}

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '$0'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

/* ---------------------------------------
   HOOKS
--------------------------------------- */
onMounted(async () => {
  await Promise.all([
    store.fetchDashboard(),
    store.fetchUpcoming(10),
    fetchTireStats()
  ])
})
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24">
    <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
  </div>

  <UPage v-else>
    <AppPageHeader
      title="Dashboard Mantenimiento"
      description="Resumen general del módulo de mantenimiento"
    />

    <div class="space-y-6 mt-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">{{ dashboard?.orders.pending ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Pendientes</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-primary-500">{{ dashboard?.orders.in_progress ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">En Progreso</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-error-500">{{ dashboard?.orders.critical ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Críticas</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-warning-500">{{ dashboard?.orders.overdue ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Vencidas</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-success-500">{{ dashboard?.orders.waiting_parts ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Esperando Rep.</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">{{ dashboard?.orders.high_priority ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">Alta Prioridad</p>
          </div>
        </UCard>
      </div>

      <!-- Cost Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <template #header>
            <span class="font-medium text-sm">Costo Este Mes</span>
          </template>
          <p class="text-3xl font-bold text-primary-500">{{ formatCurrency(dashboard?.costs.this_month) }}</p>
        </UCard>
        <UCard>
          <template #header>
            <span class="font-medium text-sm">Costo Este Año</span>
          </template>
          <p class="text-3xl font-bold">{{ formatCurrency(dashboard?.costs.this_year) }}</p>
        </UCard>
        <UCard>
          <template #header>
            <span class="font-medium text-sm">Flota</span>
          </template>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-lg font-bold">{{ dashboard?.fleet.total_vehicles ?? 0 }}</p>
              <p class="text-xs text-gray-400">Total</p>
            </div>
            <div>
              <p class="text-lg font-bold text-primary-500">{{ dashboard?.fleet.in_maintenance ?? 0 }}</p>
              <p class="text-xs text-gray-400">En Mantenimiento</p>
            </div>
            <div>
              <p class="text-lg font-bold text-error-500">{{ dashboard?.fleet.out_of_service ?? 0 }}</p>
              <p class="text-xs text-gray-400">Fuera de Servicio</p>
            </div>
            <div>
              <p class="text-lg font-bold text-success-500">{{ dashboard?.fleet.available ?? 0 }}</p>
              <p class="text-xs text-gray-400">Disponible</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Tire Stats -->
      <UCard>
        <template #header>
          <span class="font-medium text-sm">Resumen Cubiertas</span>
        </template>

        <div v-if="loadingTireStats" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader" class="animate-spin text-xl text-gray-400" />
        </div>
        <div v-else-if="tireStats" class="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold">{{ tireStats.total }}</p>
            <p class="text-xs text-gray-400">Total</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-info-500">{{ tireStats.in_stock }}</p>
            <p class="text-xs text-gray-400">En Stock</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-success-500">{{ tireStats.installed }}</p>
            <p class="text-xs text-gray-400">Instaladas</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-warning-500">{{ tireStats.in_repair }}</p>
            <p class="text-xs text-gray-400">En Reparo</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-error-500">{{ tireStats.scrapped }}</p>
            <p class="text-xs text-gray-400">Dadas de Baja</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-neutral-500">{{ tireStats.sold }}</p>
            <p class="text-xs text-gray-400">Vendidas</p>
          </div>
        </div>
      </UCard>

      <!-- Upcoming Maintenances -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Próximos Mantenimientos</span>
            <UBadge variant="soft" color="neutral">{{ upcomingMaintenances.length }}</UBadge>
          </div>
        </template>

        <div v-if="upcomingMaintenances.length" class="space-y-3">
          <NuxtLink
            v-for="item in upcomingMaintenances"
            :key="item.id"
            :to="`/logistica/mantenimiento/${item.id}`"
            class="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          >
            <UBadge
              :color="priorityConfig[item.priority]?.color ?? 'neutral'"
              variant="soft"
              size="xs"
            >
              {{ priorityConfig[item.priority]?.label ?? item.priority }}
            </UBadge>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.title }}</p>
              <p class="text-xs text-gray-400">{{ item.number }}</p>
            </div>
            <span v-if="item.vehicle" class="text-xs font-mono text-gray-400">{{ item.vehicle.plate }}</span>
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatDate(item.scheduled_at) }}</span>
          </NuxtLink>
        </div>
        <UAlert v-else color="neutral" variant="soft" icon="i-lucide-calendar-check" title="Sin mantenimientos programados" description="No hay mantenimientos próximos programados." />
      </UCard>
    </div>
  </UPage>
</template>
