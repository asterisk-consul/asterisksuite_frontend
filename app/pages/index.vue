<script setup lang="ts">
import { useDashboardConfig, buildLayout, AVAILABLE_WIDGETS } from '~/modulos/erp/dashboard/composables/useDashboardConfig'
import { useDashboardData } from '~/modulos/erp/dashboard/composables/useDashboardData'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({
  middleware: ['auth'],
})

const showConfig = ref(false)
const initialLoading = ref(true)
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const { config, enabledWidgets, fetchConfig, saveConfig, toggleWidget, resetConfig } = useDashboardConfig()
const { data: dashboardData, personal: personalData, loading: dataLoading, fetchData, fetchPersonal } = useDashboardData()

const filteredWidgets = computed(() => {
  return enabledWidgets.value.filter((w) => {
    const widgetMeta = AVAILABLE_WIDGETS.find((aw) => aw.id === w.id)
    if (!widgetMeta?.permission) return true
    return isOwnerOrAdmin.value || hasPermission(widgetMeta.permission)
  })
})

const gridLayout = computed(() => buildLayout(filteredWidgets.value))

const handleConfigUpdate = (newWidgets: { id: string; enabled: boolean; position: number; size?: 'sm' | 'md' | 'lg' }[]) => {
  config.value = newWidgets.map((w) => ({
    ...w,
    size: w.size || 'sm',
  }))
  saveConfig()
}

const handleReset = () => {
  resetConfig()
  showConfig.value = false
}

onMounted(async () => {
  await Promise.allSettled([fetchConfig(), fetchData(), fetchPersonal()])
  initialLoading.value = false
})
</script>

<template>
  <UPage class="space-y-6 px-4 flex-1 overflow-y-auto">
    <AppPageHeader title="Inicio" description="Dashboard principal">
      <template #links>
        <UButton
          label="Configurar"
          icon="i-lucide-settings"
          variant="outline"
          size="sm"
          :disabled="initialLoading"
          @click="showConfig = true"
        />
      </template>
    </AppPageHeader>

    <!-- SKELETON LOADING -->
    <div v-if="initialLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" style="grid-auto-flow: dense; grid-auto-rows: min-content">
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
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      style="grid-auto-flow: dense; grid-auto-rows: min-content"
    >
      <div
        v-for="widget in filteredWidgets"
        :key="widget.id"
        :style="{
          gridColumn: gridLayout.get(widget.id)?.gridColumn,
          gridRow: gridLayout.get(widget.id)?.gridRow,
        }"
      >
        <DashboardFinancialSummary v-if="widget.id === 'financial'" :loading="dataLoading" />
        <DashboardPersonal v-else-if="widget.id === 'personal'" :data="personalData" :loading="dataLoading" />
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
        <DashboardChart v-else-if="widget.id === 'chart'" :data="dashboardData" :loading="dataLoading" />
      </div>
    </div>

    <DashboardWidgetConfig
      :open="showConfig"
      :widgets="config"
      @update:open="showConfig = $event"
      @update:widgets="handleConfigUpdate"
      @reset="handleReset"
    />
  </UPage>
</template>

<style scoped>
.grid > div > * {
  height: 100%;
}
</style>
