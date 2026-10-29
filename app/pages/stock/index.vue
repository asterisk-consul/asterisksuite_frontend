<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })

type ReplenishmentRow = {
  id: string
  product: { id: string; name: string; sku?: string | null }
  warehouse: { id: string; name: string; code?: string | null } | null
  unit: string
  available_now: number
  suggested_quantity: number
  status: 'CRITICAL' | 'REORDER'
}

type ReplenishmentResponse = {
  data: ReplenishmentRow[]
  meta: { total: number; summary: Record<string, number> }
}

const products = useProducts()
const warehousesStore = useDepositosStore()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const can = (permissions: string[]) => isOwnerOrAdmin.value || permissions.some(permission => hasPermission(permission))
const canReadProducts = computed(() => can(['products.read']))
const canReadWarehouses = computed(() => can(['warehouses.read']))
const canReadReplenishment = computed(() => can(['stock.replenishment.read']))
const canReadAvailability = computed(() => can([
  'stock.read',
  'sales.read',
  'sales.orders.read',
  'sales.quotes.read',
  'sales.invoices.read'
]))

const dashboardLoading = ref(true)
const dashboardErrorSources = ref<string[]>([])
const productsLoaded = ref(false)
const warehousesLoaded = ref(false)
const replenishmentLoaded = ref(false)
const productCounts = computed(() => ({
  total: productsLoaded.value ? products.totalProducts.value : null,
  active: productsLoaded.value ? products.activeProducts.value : null
}))
const warehouses = computed(() => warehousesStore.warehouses)
const activeWarehouses = computed(() => warehouses.value.filter(warehouse => warehouse.active !== false).length)
const replenishment = ref<ReplenishmentResponse | null>(null)
const actionRows = computed(() => replenishment.value?.data ?? [])
const actionCount = computed(() => replenishment.value?.meta.total ?? 0)
const criticalCount = computed(() => replenishment.value?.meta.summary.CRITICAL ?? 0)
const reorderCount = computed(() => replenishment.value?.meta.summary.REORDER ?? 0)
const unconfiguredCount = computed(() => replenishment.value?.meta.summary.UNCONFIGURED ?? 0)

const statusPresentation = {
  CRITICAL: { label: 'Crítico', color: 'error' as const, icon: 'i-lucide-circle-alert' },
  REORDER: { label: 'Reponer', color: 'warning' as const, icon: 'i-lucide-package-plus' }
}

const statCards = computed(() => {
  const cards: Array<{
    label: string
    value: string | number
    detail: string
    icon: string
    color: 'info' | 'success' | 'warning' | 'error'
    to: string
  }> = []

  if (canReadProducts.value) {
    cards.push({
      label: 'Productos activos',
      value: productCounts.value.active ?? '—',
      detail: productCounts.value.total === null ? 'Conteo del catálogo' : productCounts.value.total + ' en el catálogo',
      icon: 'i-lucide-package',
      color: 'info',
      to: '/productos'
    })
  }
  if (canReadWarehouses.value) {
    cards.push({
      label: 'Depósitos activos',
      value: warehousesLoaded.value ? activeWarehouses.value : '—',
      detail: warehousesLoaded.value ? warehouses.value.length + ' en total' : 'Ubicaciones de stock',
      icon: 'i-lucide-warehouse',
      color: 'success',
      to: '/productos/warehouses'
    })
  }
  if (canReadReplenishment.value) {
    cards.push({
      label: 'Requieren reposición',
      value: replenishmentLoaded.value ? actionCount.value : '—',
      detail: replenishmentLoaded.value ? criticalCount.value + ' críticos · ' + reorderCount.value + ' para reponer' : 'Faltantes según políticas',
      icon: 'i-lucide-package-search',
      color: actionCount.value > 0 ? 'warning' : 'success',
      to: '/stock/reposicion?status=ACTION'
    })
    cards.push({
      label: 'Sin política de reposición',
      value: replenishmentLoaded.value ? unconfiguredCount.value : '—',
      detail: 'Productos inventariables por configurar',
      icon: 'i-lucide-list-todo',
      color: unconfiguredCount.value > 0 ? 'warning' : 'info',
      to: '/stock/reposicion?include_unconfigured=true'
    })
  }

  return cards
})

const catalogLinks = computed(() => [
  { label: 'Productos', description: 'Consultar y administrar el catálogo', icon: 'i-lucide-package', to: '/productos', visible: canReadProducts.value },
  { label: 'Nuevo producto', description: 'Dar de alta un artículo o servicio', icon: 'i-lucide-circle-plus', to: '/productos/create', visible: can(['products.create']) },
  { label: 'Por cliente / proveedor', description: 'Ver productos asociados a cada contraparte', icon: 'i-lucide-users-round', to: '/productos/by-party', visible: canReadProducts.value },
  { label: 'Categorías', description: 'Organizar productos por categoría', icon: 'i-lucide-folder-tree', to: '/productos/settings/categorias', visible: can(['categories.read']) },
  { label: 'Etiquetas', description: 'Clasificar productos con etiquetas', icon: 'i-lucide-tags', to: '/productos/settings/tags', visible: can(['tags.read']) },
  { label: 'Unidades de medida', description: 'Administrar unidades para los productos', icon: 'i-lucide-ruler', to: '/productos/settings/unidades', visible: can(['units.read']) },
  { label: 'Plantillas de costo', description: 'Configurar costos reutilizables de productos', icon: 'i-lucide-file-text', to: '/cost-templates', visible: canReadProducts.value }
].filter(item => item.visible))

const operationLinks = computed(() => [
  { label: 'Depósitos', description: 'Administrar ubicaciones de almacenamiento', icon: 'i-lucide-warehouse', to: '/productos/warehouses', visible: canReadWarehouses.value },
  { label: 'Disponibilidad', description: 'Ver stock libre, reservado y en tránsito', icon: 'i-lucide-chart-no-axes-combined', to: '/stock/disponibilidad', visible: canReadAvailability.value },
  { label: 'Reposición', description: 'Detectar faltantes y preparar compras', icon: 'i-lucide-package-plus', to: '/stock/reposicion', visible: canReadReplenishment.value },
  { label: 'Fabricación', description: 'Fabricar productos, consultar historial y administrar BOM', icon: 'i-lucide-factory', to: '/fabricacion', visible: can(['production.read', 'production.execute', 'production.history', 'production.manage_bom']) }
].filter(item => item.visible))

async function loadDashboard() {
  dashboardLoading.value = true
  dashboardErrorSources.value = []
  productsLoaded.value = false
  warehousesLoaded.value = false
  replenishmentLoaded.value = false
  replenishment.value = null

  const tasks: Array<{ source: string; run: () => Promise<unknown> }> = []

  if (canReadProducts.value) {
    tasks.push({
      source: 'productos',
      run: async () => {
        await products.loadCounts()
        productsLoaded.value = true
      }
    })
  }
  if (canReadWarehouses.value) {
    tasks.push({
      source: 'depósitos',
      run: async () => {
        await warehousesStore.fetchAll({ force: true })
        if (warehousesStore.error) throw new Error(warehousesStore.error)
        warehousesLoaded.value = true
      }
    })
  }
  if (canReadReplenishment.value) {
    tasks.push({
      source: 'reposición',
      run: async () => {
        replenishment.value = await $fetch<ReplenishmentResponse>('/api/backend/warehouse/replenishment/report', {
          query: { status: 'ACTION', page: 1, limit: 5 }
        })
        replenishmentLoaded.value = true
      }
    })
  }

  const results = await Promise.allSettled(tasks.map(task => task.run()))
  dashboardErrorSources.value = results.flatMap((result, index) =>
    result.status === 'rejected' ? [tasks[index]!.source] : []
  )
  dashboardLoading.value = false
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value)
}

onMounted(loadDashboard)
</script>

<template>
  <UPage class="px-4 pb-10">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-5 sm:gap-6">
      <AppPageHeader
        title="Stock"
        description="Catálogo, depósitos, disponibilidad y necesidades de reposición."
      >
        <template #links>
          <UButton
            v-if="canReadProducts"
            label="Ver productos"
            icon="i-lucide-package"
            color="neutral"
            variant="outline"
            to="/productos"
          />
          <UButton
            v-if="can(['products.create'])"
            label="Nuevo producto"
            icon="i-lucide-plus"
            color="primary"
            to="/productos/create"
          />
          <UButton
            label="Actualizar"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="dashboardLoading"
            @click="loadDashboard"
          />
        </template>
      </AppPageHeader>

      <UAlert
        v-if="dashboardErrorSources.length"
        color="warning"
        variant="soft"
        title="El resumen se cargó parcialmente"
        :description="'No se pudieron actualizar: ' + dashboardErrorSources.join(', ') + '. Podés volver a intentar.'"
        icon="i-lucide-triangle-alert"
      />

      <section v-if="statCards.length" aria-label="Indicadores de stock" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink v-for="stat in statCards" :key="stat.label" :to="stat.to" class="group block h-full">
          <UPageCard
            variant="subtle"
            class="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 space-y-1">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ stat.label }}</p>
                <p
                  class="text-3xl font-semibold tabular-nums"
                  :class="{
                    'text-info': stat.color === 'info',
                    'text-success': stat.color === 'success',
                    'text-warning': stat.color === 'warning',
                    'text-error': stat.color === 'error'
                  }"
                >{{ dashboardLoading ? '—' : stat.value }}</p>
                <p class="text-sm text-muted">{{ dashboardLoading ? 'Actualizando…' : stat.detail }}</p>
              </div>
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-xl"
                :class="{
                  'bg-info/10 text-info': stat.color === 'info',
                  'bg-success/10 text-success': stat.color === 'success',
                  'bg-warning/10 text-warning': stat.color === 'warning',
                  'bg-error/10 text-error': stat.color === 'error'
                }"
              >
                <UIcon :name="stat.icon" class="size-5" />
              </span>
            </div>
          </UPageCard>
        </NuxtLink>
      </section>

      <section
        v-if="canReadReplenishment"
        aria-label="Reposición prioritaria"
        class="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]"
      >
        <UCard variant="subtle" :ui="{ header: 'p-4 sm:p-5', body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold">Reposición prioritaria</h2>
                <p class="mt-1 text-sm text-muted">Productos críticos o por debajo del punto de reposición</p>
              </div>
              <UButton label="Ver reposición" icon="i-lucide-arrow-up-right" color="neutral" variant="outline" size="sm" to="/stock/reposicion?status=ACTION" />
            </div>
          </template>

          <div v-if="dashboardLoading" class="flex flex-col gap-3 p-4 sm:p-5">
            <USkeleton v-for="item in 4" :key="item" class="h-12 w-full rounded-lg" />
          </div>
          <div v-else-if="!replenishmentLoaded" class="px-5 py-9 text-center">
            <p class="font-medium">No se pudo consultar la reposición</p>
            <p class="mt-1 text-sm text-muted">Actualizá el resumen para volver a intentarlo.</p>
          </div>
          <div v-else-if="!actionRows.length" class="flex flex-col items-center px-5 py-9 text-center">
            <span class="flex size-11 items-center justify-center rounded-full bg-success/10 text-success">
              <UIcon name="i-lucide-circle-check" class="size-5" />
            </span>
            <p class="mt-3 font-medium">{{ actionCount === 0 ? 'No hay faltantes prioritarios' : 'No hay más productos para mostrar' }}</p>
            <p class="mt-1 text-sm text-muted">{{ actionCount === 0 ? 'Las políticas actuales cubren las necesidades de stock.' : 'Consultá el informe para ver todos los productos.' }}</p>
          </div>
          <ul v-else class="m-0 list-none divide-y divide-default p-0">
            <li v-for="row in actionRows" :key="row.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg" :class="row.status === 'CRITICAL' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'">
                  <UIcon :name="statusPresentation[row.status].icon" class="size-4" />
                </span>
                <div class="min-w-0">
                  <NuxtLink :to="'/productos/' + row.product.id + '/edit'" class="block truncate font-medium text-highlighted hover:text-primary hover:underline">
                    {{ row.product.name }}
                  </NuxtLink>
                  <p class="truncate text-xs text-muted">
                    {{ row.warehouse?.name || 'Todos los depósitos' }}<span v-if="row.product.sku"> · {{ row.product.sku }}</span>
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-4 sm:gap-6">
                <div class="text-right">
                  <p class="text-xs text-muted">Disponible</p>
                  <p class="font-semibold tabular-nums">{{ formatQuantity(row.available_now) }} {{ row.unit }}</p>
                </div>
                <div class="hidden text-right sm:block">
                  <p class="text-xs text-muted">Sugerido</p>
                  <p class="font-semibold tabular-nums">{{ formatQuantity(row.suggested_quantity) }} {{ row.unit }}</p>
                </div>
                <UBadge :label="statusPresentation[row.status].label" :color="statusPresentation[row.status].color" variant="subtle" />
              </div>
            </li>
          </ul>

          <div v-if="!dashboardLoading && actionCount > actionRows.length" class="border-t border-default px-4 py-3 text-center sm:px-5">
            <UButton :label="'Ver los ' + actionCount + ' productos que requieren atención'" color="neutral" variant="link" size="sm" to="/stock/reposicion?status=ACTION" />
          </div>
        </UCard>

        <UCard variant="subtle" :ui="{ header: 'p-4 sm:p-5', body: 'p-4 sm:p-5' }">
          <template #header>
            <div>
              <h2 class="font-semibold">Estado de reposición</h2>
              <p class="mt-1 text-sm text-muted">Resumen de las políticas activas</p>
            </div>
          </template>
          <div v-if="dashboardLoading" class="flex flex-col gap-3">
            <USkeleton v-for="item in 4" :key="item" class="h-10 w-full rounded-lg" />
          </div>
          <div v-else-if="!replenishmentLoaded" class="py-5 text-center text-sm text-muted">
            No hay datos de reposición para mostrar.
          </div>
          <div v-else class="flex flex-col gap-2">
            <NuxtLink
              v-for="item in [
                { label: 'Críticos', count: criticalCount, status: 'CRITICAL', tone: 'text-error', icon: 'i-lucide-circle-alert' },
                { label: 'Para reponer', count: reorderCount, status: 'REORDER', tone: 'text-warning', icon: 'i-lucide-package-plus' },
                { label: 'Cubiertos por arribos', count: replenishment?.meta.summary.COVERED ?? 0, status: 'COVERED', tone: 'text-info', icon: 'i-lucide-ship' },
                { label: 'Correctos', count: replenishment?.meta.summary.OK ?? 0, status: 'OK', tone: 'text-success', icon: 'i-lucide-circle-check' },
                { label: 'Sin configurar', count: unconfiguredCount, status: 'UNCONFIGURED', tone: 'text-muted', icon: 'i-lucide-settings-2' }
              ]"
              :key="item.status"
              :to="item.status === 'UNCONFIGURED' ? '/stock/reposicion?include_unconfigured=true' : '/stock/reposicion?status=' + item.status"
              class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-elevated/40"
            >
              <span class="flex min-w-0 items-center gap-2 text-sm">
                <UIcon :name="item.icon" :class="item.tone" class="size-4 shrink-0" />
                <span>{{ item.label }}</span>
              </span>
              <span class="font-semibold tabular-nums">{{ item.count ?? 0 }}</span>
            </NuxtLink>
          </div>
        </UCard>
      </section>

      <section v-if="catalogLinks.length || operationLinks.length" aria-label="Accesos de stock" class="flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-semibold">Accesos de stock</h2>
          <p class="mt-1 text-sm text-muted">Atajos a las opciones disponibles en el menú lateral.</p>
        </div>

        <div v-if="catalogLinks.length" class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted">Catálogo</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NuxtLink v-for="link in catalogLinks" :key="link.to" :to="link.to" class="group block">
              <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                <div class="flex items-start gap-3">
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UIcon :name="link.icon" class="size-5" />
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">{{ link.label }}</p>
                    <p class="mt-1 text-sm text-muted">{{ link.description }}</p>
                  </div>
                  <UIcon name="i-lucide-arrow-up-right" class="ml-auto size-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
                </div>
              </UPageCard>
            </NuxtLink>
          </div>
        </div>

        <div v-if="operationLinks.length" class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted">Operación</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NuxtLink v-for="link in operationLinks" :key="link.to" :to="link.to" class="group block">
              <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                <div class="flex items-start gap-3">
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                    <UIcon :name="link.icon" class="size-5" />
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">{{ link.label }}</p>
                    <p class="mt-1 text-sm text-muted">{{ link.description }}</p>
                  </div>
                  <UIcon name="i-lucide-arrow-up-right" class="ml-auto size-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
                </div>
              </UPageCard>
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </UPage>
</template>
