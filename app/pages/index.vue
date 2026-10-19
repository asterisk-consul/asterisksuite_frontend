<script setup lang="ts">
import { useDashboardConfig, buildLayout, AVAILABLE_WIDGETS } from '~/modulos/erp/dashboard/composables/useDashboardConfig'
import { useDashboardData } from '~/modulos/erp/dashboard/composables/useDashboardData'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'
import type { WidgetConfig } from '~/modulos/erp/dashboard/types/dashboard.types'

definePageMeta({
  middleware: ['auth'],
})

const showConfig = ref(false)
const initialLoading = ref(true)
const refreshing = ref(false)
const lastUpdated = ref<Date | null>(null)
const toast = useToast()
const auth = useAuthStore()
const { hasPermission } = useRoles()
const { companyRole, isOwnerOrAdmin } = useCompanyRole()

const { config, enabledWidgets, fetchConfig, saveConfig, resetConfig } = useDashboardConfig()
const { data: dashboardData, personal: personalData, loading: dataLoading, fetchData, fetchPersonal } = useDashboardData()

// Rango de fechas del bloque "Actividad de la empresa" (en días)
const dashboardRange = ref(30)
const handleRangeChange = async (value: number | string) => {
  const days = Number(value)
  if (!Number.isFinite(days) || days <= 0) return
  dashboardRange.value = days
  await fetchData(dashboardRange.value)
}

const canAccessWidget = (widget: typeof AVAILABLE_WIDGETS[number]) => {
  if (isOwnerOrAdmin.value) return true
  if (widget.permissions?.length) return widget.permissions.some(permission => hasPermission(permission))
  return !widget.permission || hasPermission(widget.permission)
}

const filteredWidgets = computed(() => {
  return enabledWidgets.value.filter((w) => {
    const widgetMeta = AVAILABLE_WIDGETS.find((aw) => aw.id === w.id)
    return widgetMeta ? canAccessWidget(widgetMeta) : false
  })
})

const allowedWidgetIds = computed(() => AVAILABLE_WIDGETS
  .filter(canAccessWidget)
  .map(widget => widget.id))

const firstName = computed(() => auth.user?.name?.trim().split(/\s+/)[0] || 'Hola')
const companyName = computed(() => auth.selectedCompany?.name || 'tu empresa')
const roleLabel = computed(() => ({ OWNER: 'Propietario', ADMIN: 'Administrador', USER: 'Usuario' }[companyRole.value ?? 'USER']))
const currentDate = computed(() => new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date()))
const updatedLabel = computed(() => lastUpdated.value
  ? `Actualizado ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated.value)}`
  : 'Preparando información')

const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
}).format(value || 0)

const overviewItems = computed(() => {
  const items: Array<{ label: string; value: string; detail: string; icon: string; cardClass: string; iconClass: string; to: string }> = []
  const data = dashboardData.value

  if ((isOwnerOrAdmin.value || hasPermission('documents.read')) && data?.receivables) {
    items.push({ label: 'Por cobrar', value: formatCurrency(data.receivables.totalAmount), detail: `${data.receivables.total} clientes con saldo`, icon: 'i-lucide-hand-coins', cardClass: 'from-emerald-500 to-teal-600', iconClass: 'bg-white/20', to: '/erp/treasury/current-accounts' })
  }
  if ((isOwnerOrAdmin.value || hasPermission('checks.read')) && data?.checksDue) {
    items.push({ label: 'Cheques próximos', value: String(data.checksDue.count), detail: formatCurrency(data.checksDue.totalAmount), icon: 'i-lucide-calendar-clock', cardClass: 'from-amber-500 to-orange-600', iconClass: 'bg-white/20', to: '/erp/treasury/checks' })
  }
  if ((isOwnerOrAdmin.value || hasPermission('products.read')) && data?.stock) {
    items.push({ label: 'Alertas de stock', value: String(data.stock.lowStockCount), detail: `${data.stock.totalProducts} productos con stock`, icon: 'i-lucide-package-search', cardClass: 'from-rose-500 to-pink-600', iconClass: 'bg-white/20', to: '/stock' })
  }
  if ((isOwnerOrAdmin.value || hasPermission('documents.read')) && data?.orders) {
    const pendingDelivery = (data.orders.byStatus[1] ?? 0) + (data.orders.byStatus[2] ?? 0) + (data.orders.byStatus[3] ?? 0) + (data.orders.byStatus[4] ?? 0)
    items.push({ label: 'Órdenes de venta', value: String(pendingDelivery), detail: `${data.orders.total} en total · ${formatCurrency(data.orders.totalValue)}`, icon: 'i-lucide-shopping-cart', cardClass: 'from-sky-500 to-blue-600', iconClass: 'bg-white/20', to: '/erp/orders' })
  }
  if (items.length < 4 && personalData.value) {
    items.push({ label: 'Mis pendientes', value: String(personalData.value.pendingDocuments), detail: 'Documentos por completar', icon: 'i-lucide-list-checks', cardClass: 'from-violet-500 to-indigo-600', iconClass: 'bg-white/20', to: '/' })
  }
  return items.slice(0, 4)
})

const gridLayout = computed(() => buildLayout(filteredWidgets.value))

const handleConfigUpdate = async (newWidgets: WidgetConfig[]) => {
  const allowed = new Set(allowedWidgetIds.value)
  const unavailable = config.value.filter(widget => !allowed.has(widget.id))
  config.value = [...newWidgets, ...unavailable].map((w, index) => ({
    ...w,
    size: w.size || 'sm',
    position: index,
  }))
  const saved = await saveConfig()
  toast.add(saved
    ? { title: 'Inicio actualizado', description: 'Guardamos tu vista personal.', color: 'success' }
    : { title: 'No pudimos guardar la vista', description: 'Revisá tu conexión e intentá nuevamente.', color: 'error' })
}

const handleReset = async () => {
  const saved = await resetConfig()
  showConfig.value = false
  toast.add(saved
    ? { title: 'Vista restablecida', description: 'Volvimos a la organización recomendada.', color: 'success' }
    : { title: 'No pudimos restablecer la vista', description: 'Revisá tu conexión e intentá nuevamente.', color: 'error' })
}

const refreshDashboard = async () => {
  refreshing.value = true
  await Promise.allSettled([fetchData(dashboardRange.value), fetchPersonal()])
  lastUpdated.value = new Date()
  refreshing.value = false
}

const openConfig = () => {
  showConfig.value = true
}

onMounted(async () => {
  await Promise.allSettled([fetchConfig(), fetchData(dashboardRange.value), fetchPersonal()])
  lastUpdated.value = new Date()
  initialLoading.value = false
})
</script>

<template>
  <UPage class="flex-1 overflow-y-auto px-4 pb-10">
    <div class="dashboard-sections">
    <AppPageHeader :title="`Hola, ${firstName}`" :description="`${companyName} · ${currentDate}`">
      <template #links>
        <UButton
          label="Actualizar"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="refreshing"
          :disabled="initialLoading"
          @click="refreshDashboard"
        />
        <UButton
          label="Personalizar"
          icon="i-lucide-layout-dashboard"
          variant="outline"
          size="sm"
          :disabled="initialLoading"
          @click="openConfig"
        />
      </template>
    </AppPageHeader>

    <section v-if="!initialLoading" class="overflow-hidden rounded-2xl border border-default bg-gradient-to-br from-primary/10 via-default to-default shadow-sm">
      <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <div class="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-inverted shadow-lg shadow-primary/20">
            <UIcon name="i-lucide-building-2" class="size-6" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-lg font-semibold">{{ companyName }}</h2>
              <UBadge :label="roleLabel" color="primary" variant="soft" size="sm" />
            </div>
            <p class="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <span class="size-1.5 rounded-full bg-success" />
              {{ updatedLabel }}
            </p>
          </div>
        </div>
        <p class="max-w-xl text-sm leading-6 text-muted">
          Tu resumen prioriza la información habilitada para tu rol. Podés personalizar los bloques sin afectar la vista de otros usuarios.
        </p>
      </div>

    </section>

    <section v-if="!initialLoading && overviewItems.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" style="gap: 1.25rem">
      <NuxtLink
        v-for="item in overviewItems"
        :key="item.label"
        :to="item.to"
        class="group relative min-h-32 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
        :class="item.cardClass"
      >
        <div class="absolute -right-6 -top-8 size-28 rounded-full bg-white/10" />
        <div class="absolute -bottom-10 right-10 size-24 rounded-full bg-black/5" />
        <div class="relative flex items-start gap-3">
          <div class="grid size-11 shrink-0 place-items-center rounded-full backdrop-blur-sm" :class="item.iconClass">
            <UIcon :name="item.icon" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-white/80">{{ item.label }}</p>
            <p class="mt-1 truncate text-xl font-bold tracking-tight">{{ item.value }}</p>
            <p class="mt-1 truncate text-xs text-white/75">{{ item.detail }}</p>
          </div>
          <UIcon name="i-lucide-arrow-up-right" class="size-4 text-white/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </NuxtLink>
    </section>

    <!-- SKELETON LOADING -->
    <div v-if="initialLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" style="gap: 1.5rem; grid-auto-flow: dense; grid-auto-rows: min-content">
      <UPageCard variant="subtle" class="xl:col-span-3">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <USkeleton class="size-5 rounded" />
            <USkeleton class="h-4 w-24 rounded" />
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="p-3 rounded-lg bg-muted/30">
              <div class="flex items-center gap-3">
                <USkeleton class="size-10 rounded-lg" />
                <div class="space-y-1.5">
                  <USkeleton class="h-3 w-20 rounded" />
                  <USkeleton class="h-4 w-28 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard variant="subtle" class="md:row-span-2">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <USkeleton class="size-5 rounded" />
              <USkeleton class="h-4 w-32 rounded" />
            </div>
            <USkeleton class="h-3 w-16 rounded" />
          </div>
          <div class="space-y-2">
            <div v-for="j in 4" :key="j" class="flex items-center justify-between py-2 px-3 rounded-lg">
              <div class="flex items-center gap-2">
                <USkeleton class="h-5 w-20 rounded-full" />
              </div>
              <USkeleton class="h-4 w-8 rounded" />
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <USkeleton class="size-5 rounded" />
              <USkeleton class="h-4 w-32 rounded" />
            </div>
            <USkeleton class="h-3 w-16 rounded" />
          </div>
          <div class="space-y-2">
            <div v-for="j in 3" :key="j" class="flex items-center justify-between py-2 px-3 rounded-lg">
              <div class="flex items-center gap-2">
                <USkeleton class="h-5 w-20 rounded-full" />
              </div>
              <USkeleton class="h-4 w-8 rounded" />
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard variant="subtle" class="md:col-span-2 xl:col-span-3">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <USkeleton class="size-5 rounded" />
            <USkeleton class="h-4 w-32 rounded" />
          </div>
          <div class="flex flex-wrap gap-2">
            <USkeleton v-for="i in 6" :key="i" class="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </UPageCard>

      <UPageCard variant="subtle" class="md:col-span-2 xl:col-span-3">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <USkeleton class="size-5 rounded" />
            <USkeleton class="h-4 w-36 rounded" />
          </div>
          <USkeleton class="h-48 w-full rounded-lg" />
        </div>
      </UPageCard>
    </div>

    <!-- CONTENIDO REAL -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      style="gap: 1.5rem; grid-auto-flow: dense; grid-auto-rows: min-content"
    >
      <div
        v-for="widget in filteredWidgets"
        :key="widget.id"
        :style="{
          gridColumn: gridLayout.get(widget.id)?.gridColumn,
          gridRow: gridLayout.get(widget.id)?.gridRow,
        }"
        class="dashboard-widget"
      >
        <DashboardFinancialSummary v-if="widget.id === 'financial'" :loading="dataLoading" />
        <DashboardExchangeRate v-else-if="widget.id === 'exchange_rate'" />
        <DashboardPersonal v-else-if="widget.id === 'personal'" :data="personalData ?? undefined" :loading="dataLoading" />
        <DashboardBudgets v-else-if="widget.id === 'quotes'" :data="dashboardData?.quotes" :loading="dataLoading" />
        <DashboardOrders v-else-if="widget.id === 'orders'" :data="dashboardData?.orders" :loading="dataLoading" />
        <DashboardRemitos v-else-if="widget.id === 'remitos'" :data="dashboardData?.remitos" :loading="dataLoading" />
        <DashboardRRHH v-else-if="widget.id === 'hr'" :data="dashboardData?.hr" :loading="dataLoading" />
        <DashboardStock v-else-if="widget.id === 'stock'" :data="dashboardData?.stock" :loading="dataLoading" />
        <DashboardReceivables v-else-if="widget.id === 'receivables'" :data="dashboardData?.receivables" :loading="dataLoading" />
        <DashboardCosting v-else-if="widget.id === 'costing'" :data="dashboardData?.costing" :loading="dataLoading" />
        <DashboardCurrentAccounts v-else-if="widget.id === 'current_accounts'" :data="dashboardData?.currentAccounts" :loading="dataLoading" />
        <DashboardPicking v-else-if="widget.id === 'picking'" :data="dashboardData?.picking" :loading="dataLoading" />
        <DashboardTrips v-else-if="widget.id === 'active_trips'" :data="dashboardData?.trips" :loading="dataLoading" />
        <DashboardChecks v-else-if="widget.id === 'checks_due'" :data="dashboardData?.checksDue" :loading="dataLoading" />
        <DashboardPaymentsDue v-else-if="widget.id === 'payments_due'" :data="dashboardData?.paymentsDue" :loading="dataLoading" />
        <DashboardQuickActions v-else-if="widget.id === 'quick_actions'" />
        <DashboardChart v-else-if="widget.id === 'chart'" :data="dashboardData ?? undefined" :loading="dataLoading" @range-change="handleRangeChange" />
      </div>

      <UPageCard v-if="filteredWidgets.length === 0" class="md:col-span-2 xl:col-span-3">
        <div class="flex flex-col items-center py-10 text-center">
          <div class="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-layout-dashboard" class="size-6" />
          </div>
          <h3 class="font-semibold">Tu inicio está listo para personalizar</h3>
          <p class="mt-1 max-w-md text-sm text-muted">Activá los widgets que necesitás para trabajar, según las opciones disponibles para tu rol.</p>
          <UButton label="Elegir widgets" icon="i-lucide-settings-2" class="mt-4" @click="openConfig" />
        </div>
      </UPageCard>
    </div>
    </div>

    <DashboardWidgetConfig
      :open="showConfig"
      :widgets="config"
      :allowed-widget-ids="allowedWidgetIds"
      @update:open="showConfig = $event"
      @update:widgets="handleConfigUpdate"
      @reset="handleReset"
    />
  </UPage>
</template>

<style scoped>
.dashboard-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
}

.grid > div > * {
  height: 100%;
}

.dashboard-widget {
  min-width: 0;
  transition: transform 180ms ease, filter 180ms ease;
}

.dashboard-widget:hover {
  transform: translateY(-2px);
  filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.08));
}
</style>
