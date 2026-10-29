<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Fabricación' })

type ProductionSummary = {
  total_fabrications: number
  total_quantity: number
  recent_fabrications: number
  recent_quantity: number
  last_fabrication_at: string | null
}

type ProductionRecord = {
  id: string
  product?: { name?: string | null; sku?: string | null } | null
  warehouse?: { name?: string | null } | null
  quantity: number
  created_at: string
}

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const can = (permissions: string[]) => isOwnerOrAdmin.value || permissions.some(permission => hasPermission(permission))
const canReadSummary = computed(() => can(['production.read', 'production.execute', 'production.history']))
const canReadHistory = computed(() => can(['production.history']))
const canExecute = computed(() => can(['production.execute']))
const canManageBom = computed(() => can(['production.manage_bom']))

const summary = ref<ProductionSummary | null>(null)
const recentProductions = ref<ProductionRecord[]>([])
const loading = ref(false)
const summaryError = ref(false)
const historyError = ref(false)

const stats = computed(() => {
  if (!summary.value) return []
  return [
    {
      label: 'Fabricaciones registradas',
      value: formatQuantity(summary.value.total_fabrications, 0),
      detail: summary.value.last_fabrication_at
        ? `Última: ${formatDate(summary.value.last_fabrication_at)}`
        : 'Todavía no hay fabricaciones',
      icon: 'i-lucide-factory',
      color: 'info'
    },
    {
      label: 'Unidades fabricadas',
      value: formatQuantity(summary.value.total_quantity),
      detail: 'Cantidad ingresada históricamente',
      icon: 'i-lucide-package-check',
      color: 'success'
    },
    {
      label: 'Fabricaciones · últimos 30 días',
      value: formatQuantity(summary.value.recent_fabrications, 0),
      detail: 'Actividad reciente',
      icon: 'i-lucide-calendar-days',
      color: 'warning'
    },
    {
      label: 'Unidades · últimos 30 días',
      value: formatQuantity(summary.value.recent_quantity),
      detail: 'Ingresadas a producto terminado',
      icon: 'i-lucide-chart-no-axes-combined',
      color: 'primary'
    }
  ]
})

const quickActions = computed(() => [
  ...(canExecute.value ? [{ label: 'Registrar fabricación', description: 'Consumir materiales e ingresar el producto terminado.', icon: 'i-lucide-factory', to: '/fabricacion/fabricar' }] : []),
  ...(canReadHistory.value ? [{ label: 'Historial de fabricación', description: 'Consultar las últimas operaciones registradas.', icon: 'i-lucide-history', to: '/fabricacion/historial' }] : []),
  ...(canManageBom.value ? [{ label: 'BOM e ingeniería', description: 'Revisar estructuras y componentes de fabricación.', icon: 'i-lucide-git-branch', to: '/bom' }] : []),
  ...(canManageBom.value ? [{ label: 'Crear BOM', description: 'Definir materiales para un producto compuesto.', icon: 'i-lucide-list-plus', to: '/bom/create' }] : [])
])

function formatQuantity(value: number, maximumFractionDigits = 3) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits }).format(Number(value ?? 0))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function loadDashboard() {
  if (loading.value) return
  loading.value = true
  summaryError.value = false
  historyError.value = false
  summary.value = null
  recentProductions.value = []

  const [summaryResult, historyResult] = await Promise.allSettled([
    canReadSummary.value
      ? $fetch<ProductionSummary>('/api/backend/warehouse/stock/production/summary')
      : Promise.resolve(null),
    canReadHistory.value
      ? $fetch<ProductionRecord[]>('/api/backend/warehouse/stock/production/history', { query: { limit: 5 } })
      : Promise.resolve([] as ProductionRecord[])
  ])

  if (summaryResult.status === 'fulfilled') summary.value = summaryResult.value
  else summaryError.value = true

  if (historyResult.status === 'fulfilled') recentProductions.value = historyResult.value
  else historyError.value = true

  loading.value = false
}

onMounted(loadDashboard)
</script>

<template>
  <UPage class="px-4 pb-10">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-5 sm:gap-6">
      <AppPageHeader title="Fabricación" description="Producción registrada, unidades ingresadas y actividad reciente.">
        <template #links>
          <UButton
            v-if="canReadHistory"
            label="Historial"
            icon="i-lucide-history"
            color="neutral"
            variant="outline"
            to="/fabricacion/historial"
          />
          <UButton
            v-if="canExecute"
            label="Fabricar producto"
            icon="i-lucide-factory"
            color="primary"
            to="/fabricacion/fabricar"
          />
          <UButton
            label="Actualizar"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="loading"
            @click="loadDashboard"
          />
        </template>
      </AppPageHeader>

      <UAlert
        v-if="summaryError || historyError"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="El resumen se cargó parcialmente"
        :description="[
          summaryError ? 'No se pudieron actualizar los indicadores.' : '',
          historyError ? 'No se pudo cargar el historial reciente.' : ''
        ].filter(Boolean).join(' ') + ' Podés volver a intentar.'"
      />

      <UAlert
        v-if="!canReadSummary"
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="Indicadores de producción no disponibles"
        description="Se necesita permiso de lectura, ejecución o historial de fabricación para consultar los indicadores. Los accesos disponibles aparecen abajo."
      />

      <section v-if="canReadSummary" aria-label="Indicadores de fabricación" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <template v-if="loading">
          <UCard v-for="item in 4" :key="item" variant="subtle">
            <div class="space-y-3"><USkeleton class="h-3 w-2/3" /><USkeleton class="h-8 w-1/2" /><USkeleton class="h-3 w-3/4" /></div>
          </UCard>
        </template>
        <template v-else-if="summary">
          <UPageCard v-for="stat in stats" :key="stat.label" variant="subtle" class="h-full">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 space-y-1">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ stat.label }}</p>
                <p class="text-3xl font-semibold tabular-nums" :class="{
                  'text-info': stat.color === 'info',
                  'text-success': stat.color === 'success',
                  'text-warning': stat.color === 'warning',
                  'text-primary': stat.color === 'primary'
                }">{{ stat.value }}</p>
                <p class="text-sm text-muted">{{ stat.detail }}</p>
              </div>
              <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon :name="stat.icon" class="size-5" />
              </span>
            </div>
          </UPageCard>
        </template>
        <UCard v-else-if="summaryError" class="sm:col-span-2 xl:col-span-4" variant="subtle">
          <div class="py-5 text-center">
            <p class="font-medium">No se pudieron consultar los indicadores de fabricación.</p>
            <UButton class="mt-3" label="Reintentar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" @click="loadDashboard" />
          </div>
        </UCard>
      </section>

      <div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <UCard v-if="canReadHistory" variant="subtle" :ui="{ header: 'p-4 sm:p-5', body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold">Fabricaciones recientes</h2>
                <p class="mt-1 text-sm text-muted">Últimos productos terminados ingresados al stock</p>
              </div>
              <UButton label="Ver historial" icon="i-lucide-arrow-up-right" color="neutral" variant="outline" size="sm" to="/fabricacion/historial" />
            </div>
          </template>

          <div v-if="loading" class="flex flex-col gap-3 p-4 sm:p-5">
            <USkeleton v-for="item in 4" :key="item" class="h-14 w-full rounded-lg" />
          </div>
          <div v-else-if="historyError" class="px-5 py-9 text-center">
            <p class="font-medium">No se pudo consultar la actividad reciente</p>
            <UButton class="mt-3" label="Reintentar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" size="sm" @click="loadDashboard" />
          </div>
          <div v-else-if="!recentProductions.length" class="flex flex-col items-center px-5 py-10 text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UIcon name="i-lucide-factory" class="size-5" /></span>
            <p class="mt-3 font-medium">Todavía no hay fabricaciones registradas</p>
            <p class="mt-1 text-sm text-muted">Cuando registres una fabricación, vas a verla resumida acá.</p>
            <UButton v-if="canExecute" class="mt-4" label="Registrar fabricación" icon="i-lucide-plus" to="/fabricacion/fabricar" />
          </div>
          <ul v-else class="m-0 list-none divide-y divide-default p-0">
            <li v-for="production in recentProductions" :key="production.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-package-check" class="size-4" /></span>
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ production.product?.name || 'Producto sin nombre' }}</p>
                  <p class="text-xs text-muted">{{ production.product?.sku || 'Sin SKU' }} · {{ production.warehouse?.name || 'Sin depósito' }}</p>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-semibold tabular-nums">{{ formatQuantity(production.quantity) }} u.</p>
                <p class="text-xs text-muted">{{ formatDate(production.created_at) }}</p>
              </div>
            </li>
          </ul>
        </UCard>

        <UCard variant="subtle" :ui="{ header: 'p-4 sm:p-5', body: 'p-4 sm:p-5' }">
          <template #header>
            <div>
              <h2 class="font-semibold">Accesos de fabricación</h2>
              <p class="mt-1 text-sm text-muted">Ir directo a una tarea del módulo</p>
            </div>
          </template>
          <div v-if="quickActions.length" class="flex flex-col gap-2">
            <NuxtLink
              v-for="action in quickActions"
              :key="action.to"
              :to="action.to"
              class="group flex items-start gap-3 rounded-lg border border-default p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon :name="action.icon" class="size-4" /></span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium group-hover:text-primary">{{ action.label }}</span>
                <span class="mt-0.5 block text-xs text-muted">{{ action.description }}</span>
              </span>
              <UIcon name="i-lucide-arrow-up-right" class="mt-1 size-4 shrink-0 text-muted" />
            </NuxtLink>
          </div>
          <p v-else class="text-sm text-muted">No tenés accesos de fabricación disponibles con los permisos actuales.</p>
        </UCard>
      </div>
    </div>
  </UPage>
</template>
