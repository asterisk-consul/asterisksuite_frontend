<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { useCompanyRole } from '~/composables/useCompanyRole'
import {
  HR_VALE_TYPE_LABELS,
  HR_VALE_STATUS_LABELS,
  HR_VALE_STATUS_COLORS
} from '~/modulos/erp/hr/types/hr.types'
import type { HrVale } from '~/modulos/erp/hr/types/hr.types'
import CreateValeModal from '~/modulos/erp/hr/components/CreateValeModal.vue'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const { isOwnerOrAdmin } = useCompanyRole()

const showSensitiveData = computed(() => isOwnerOrAdmin.value)

const totalEmployees = ref(0)
const activeEmployees = ref(0)
const totalPartners = ref(0)
const activePartners = ref(0)
const totalVales = ref(0)
const pendingVales = ref(0)
const dashboardLoading = ref(true)
const dashboardError = ref(false)
const showCreateValeModal = ref(false)
const selectedPeriodMonths = ref(6)
const periodOptions = [
  { label: 'Últimos 3 meses', value: 3 },
  { label: 'Últimos 6 meses', value: 6 },
  { label: 'Últimos 12 meses', value: 12 },
]
const monthKeys = computed(() => {
  const current = new Date()
  current.setDate(1)
  current.setHours(12, 0, 0, 0)
  return Array.from({ length: selectedPeriodMonths.value }, (_, index) => {
    const month = new Date(current)
    month.setMonth(current.getMonth() - selectedPeriodMonths.value + index + 1)
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  })
})

const periodVales = computed(() => hrStore.vales.filter(vale => monthKeys.value.includes(vale.date?.slice(0, 7) ?? '')))
const activePeriodVales = computed(() => periodVales.value.filter(vale => vale.status !== 'CANCELLED'))
const currentMonthKey = computed(() => monthKeys.value[monthKeys.value.length - 1])
const currentMonthVales = computed(() => activePeriodVales.value.filter(vale => vale.date?.slice(0, 7) === currentMonthKey.value).length)
const valeStatusCounts = computed(() => [
  { status: 'DRAFT', label: 'Borrador', color: 'text-muted', count: periodVales.value.filter(vale => vale.status === 'DRAFT').length },
  { status: 'CONFIRMED', label: 'Confirmado', color: 'text-warning', count: periodVales.value.filter(vale => vale.status === 'CONFIRMED').length },
  { status: 'PAID', label: 'Pagado', color: 'text-success', count: periodVales.value.filter(vale => vale.status === 'PAID').length },
  { status: 'CANCELLED', label: 'Anulado', color: 'text-error', count: periodVales.value.filter(vale => vale.status === 'CANCELLED').length },
])
const valeStatusTotal = computed(() => valeStatusCounts.value.reduce((sum, item) => sum + item.count, 0))
const hasActivityChart = computed(() => activePeriodVales.value.length > 0)
const activityChart = computed(() => {
  const monthLabels = monthKeys.value.map(key => {
    const [year, month] = key.split('-').map(Number)
    const monthOptions: Intl.DateTimeFormatOptions = selectedPeriodMonths.value === 12
      ? { month: 'short', year: '2-digit' }
      : { month: 'short' }
    return new Intl.DateTimeFormat('es-AR', monthOptions).format(new Date(year, month - 1, 1, 12))
  })
  const monthlyCounts = monthKeys.value.map(key => {
    const monthVales = activePeriodVales.value.filter(vale => vale.date?.slice(0, 7) === key)
    return {
      debits: monthVales.filter(vale => ['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(vale.type)).length,
      credits: monthVales.filter(vale => !['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(vale.type)).length,
    }
  })

  return {
    animation: false,
    color: ['#f87171', '#34d399'],
    tooltip: {
      trigger: 'axis',
      formatter: (items: any[]) => {
        const heading = String(items?.[0]?.axisValue ?? '')
        return [heading, ...(items ?? []).map(item => `${item.marker} ${item.seriesName}: <strong>${Number(item.value)}</strong> vales`)].join('<br/>')
      },
    },
    legend: { top: 0, textStyle: { color: '#a1a1aa', fontSize: 11 } },
    grid: { left: 34, right: 12, top: 32, bottom: 26, containLabel: true },
    xAxis: {
      type: 'category',
      data: monthLabels,
      axisTick: { alignWithLabel: true, lineStyle: { color: '#52525b' } },
      axisLine: { lineStyle: { color: '#52525b' } },
      axisLabel: { color: '#a1a1aa', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      axisLabel: { color: '#a1a1aa', fontSize: 11 },
      splitLine: { lineStyle: { color: '#34343a', type: 'dashed' } },
    },
    series: [
      { name: 'Retiros y débitos', type: 'bar', data: monthlyCounts.map(item => item.debits), barMaxWidth: 30, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: 'Aportes y créditos', type: 'bar', data: monthlyCounts.map(item => item.credits), barMaxWidth: 30, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
  }
})

async function loadDashboard() {
  dashboardLoading.value = true
  dashboardError.value = false
  try {
    const [employees, partners, vales] = await Promise.all([
      $fetch<any[]>('/api/backend/employees'),
      $fetch<any[]>('/api/backend/partners'),
      hrStore.fetchVales(),
    ])

    // Empleados
    totalEmployees.value = employees.length
    activeEmployees.value = employees.filter((e: any) => e.is_active !== false).length

    // Socios
    totalPartners.value = partners.length
    activePartners.value = partners.filter((p: any) => p.is_active !== false).length

    // Vales
    totalVales.value = vales.filter((v: any) => v.status !== 'CANCELLED').length
    pendingVales.value = vales.filter((v: any) => v.status === 'DRAFT').length

  } catch (e) {
    console.error(e)
    dashboardError.value = true
  } finally {
    dashboardLoading.value = false
  }
}

onMounted(() => loadDashboard())

function fmt(n: number | string | null | undefined, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n ?? 0)
}

function fmtDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  const date = value.split('T')[0]
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}

function valeTypeLabel(vale: HrVale) {
  if (vale.party_type === 'PARTNER') {
    return ({ SUELDO: 'Remuneración', APORTE: 'Aporte de fondos', RETIRO: 'Retiro de aportes', PRESTAMO: 'Préstamo al socio' } as Record<string, string>)[vale.type] ?? HR_VALE_TYPE_LABELS[vale.type] ?? vale.type
  }
  return HR_VALE_TYPE_LABELS[vale.type] ?? vale.type
}

function valeStatusLabel(vale: HrVale) {
  return HR_VALE_STATUS_LABELS[vale.status] ?? vale.status
}
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
    <div class="flex min-w-0 flex-col gap-5 sm:gap-6">
    <AppPageHeader title="RRHH" description="Personas, vales y cuentas corrientes internas">
      <template #links>
        <UButton label="Ver vales" icon="i-lucide-receipt-text" to="/erp/rrhh/vales" variant="soft" color="neutral" />
        <UButton label="Nuevo vale" icon="i-lucide-plus" color="primary" @click="showCreateValeModal = true" />
      </template>
    </AppPageHeader>

    <UAlert
      v-if="dashboardError"
      color="error"
      variant="soft"
      title="No se pudo cargar todo el resumen"
      description="Revisá la conexión y volvé a cargar la página."
      icon="i-lucide-circle-alert"
    />

    <section aria-label="Resumen de recursos humanos" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink to="/erp/rrhh/employees" class="group block h-full">
        <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-info/40 group-hover:bg-info/5">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Empleados</p>
              <p class="text-3xl font-semibold text-info">{{ dashboardLoading ? '—' : totalEmployees }}</p>
              <p class="text-sm text-muted">{{ dashboardLoading ? 'Cargando…' : `${activeEmployees} activos` }}</p>
            </div>
            <span class="flex size-11 items-center justify-center rounded-xl bg-info/10 text-info">
              <UIcon name="i-lucide-users-round" class="size-5" />
            </span>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/partners" class="group block h-full">
        <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-warning/40 group-hover:bg-warning/5">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Socios</p>
              <p class="text-3xl font-semibold text-warning">{{ dashboardLoading ? '—' : totalPartners }}</p>
              <p class="text-sm text-muted">{{ dashboardLoading ? 'Cargando…' : `${activePartners} activos` }}</p>
            </div>
            <span class="flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon name="i-lucide-handshake" class="size-5" />
            </span>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/vales" class="group block h-full">
        <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Vales pendientes</p>
              <p class="text-3xl font-semibold text-primary">{{ dashboardLoading ? '—' : pendingVales }}</p>
              <p class="text-sm text-muted">{{ dashboardLoading ? 'Cargando…' : `${totalVales} vales vigentes` }}</p>
            </div>
            <span class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-receipt-text" class="size-5" />
            </span>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/vales" class="group block h-full">
        <UPageCard variant="subtle" class="h-full transition-colors group-hover:border-success/40 group-hover:bg-success/5">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Vales este mes</p>
              <p class="text-3xl font-semibold text-success">{{ dashboardLoading ? '—' : currentMonthVales }}</p>
              <p class="text-sm text-muted">Anulados excluidos</p>
            </div>
            <span class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-calendar-days" class="size-5" />
            </span>
          </div>
        </UPageCard>
      </NuxtLink>
    </section>

    <section class="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]" aria-label="Actividad de RRHH">
      <UCard variant="subtle" class="min-w-0" :ui="{ header: 'p-4 sm:p-5', body: 'p-4 sm:p-5' }">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold">Actividad de vales</h2>
              <p class="mt-1 text-sm text-muted">Cantidad registrada por mes; los anulados no se cuentan.</p>
            </div>
            <USelect v-model="selectedPeriodMonths" :items="periodOptions" class="w-44" aria-label="Período del gráfico" />
          </div>
        </template>

        <div v-if="dashboardLoading" class="space-y-3 py-3">
          <USkeleton class="h-[300px] w-full rounded-lg" />
        </div>
        <div v-else-if="!hasActivityChart" class="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-default px-6 text-center">
          <span class="flex size-11 items-center justify-center rounded-full bg-muted/50 text-muted">
            <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-5" />
          </span>
          <p class="mt-3 font-medium">Todavía no hay actividad en este período</p>
          <p class="mt-1 text-sm text-muted">Al registrar o confirmar vales, vas a ver la evolución acá.</p>
        </div>
        <VChart v-else :option="activityChart" autoresize class="w-full" style="height: 300px" />
      </UCard>

      <div class="flex min-w-0 flex-col gap-4">
        <UCard variant="subtle" class="flex-1" :ui="{ header: 'p-4 sm:p-5', body: 'p-4 sm:p-5' }">
          <template #header>
            <div>
              <h2 class="font-semibold">Estado de los vales</h2>
              <p class="mt-1 text-sm text-muted">Período seleccionado</p>
            </div>
          </template>
          <div v-if="dashboardLoading" class="space-y-4 py-2">
            <USkeleton v-for="item in 4" :key="item" class="h-8 w-full rounded-md" />
          </div>
          <div v-else-if="valeStatusTotal === 0" class="py-5 text-center text-sm text-muted">
            No hay vales para resumir en este período.
          </div>
          <div v-else class="flex flex-col gap-3">
            <div v-for="item in valeStatusCounts" :key="item.status" class="space-y-1.5">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span :class="item.color">{{ item.label }}</span>
                <span class="font-medium tabular-nums">{{ item.count }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-muted/40">
                <div
                  class="h-full rounded-full transition-[width]"
                  :class="{
                    'bg-muted': item.status === 'DRAFT',
                    'bg-warning': item.status === 'CONFIRMED',
                    'bg-success': item.status === 'PAID',
                    'bg-error': item.status === 'CANCELLED'
                  }"
                  :style="{ width: `${Math.max(item.count ? 4 : 0, (item.count / valeStatusTotal) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </UCard>

        <UCard variant="subtle" :ui="{ body: 'p-4 sm:p-5' }">
          <h2 class="font-semibold">Accesos rápidos</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton label="Empleados" icon="i-lucide-users-round" size="sm" variant="soft" color="neutral" to="/erp/rrhh/employees" />
            <UButton label="Socios" icon="i-lucide-handshake" size="sm" variant="soft" color="neutral" to="/erp/rrhh/partners" />
            <UButton v-if="showSensitiveData" label="Cuentas corrientes" icon="i-lucide-book-open-check" size="sm" variant="soft" color="neutral" to="/erp/rrhh/current-accounts" />
            <UButton label="Comisiones" icon="i-lucide-chart-no-axes-combined" size="sm" variant="soft" color="neutral" to="/erp/rrhh/commissions" />
            <UButton label="Reporte de socios" icon="i-lucide-chart-pie" size="sm" variant="soft" color="neutral" to="/erp/rrhh/reports/socios" />
          </div>
        </UCard>
      </div>
    </section>

    <UCard variant="subtle" :ui="{ header: 'p-4 sm:p-5', body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">Vales recientes</h2>
            <p class="mt-1 text-xs text-muted">Empleados y socios · {{ hrStore.vales.length }} movimientos</p>
          </div>
          <UButton label="Ver todos" icon="i-lucide-arrow-up-right" variant="ghost" color="neutral" size="sm" to="/erp/rrhh/vales" />
        </div>
      </template>

      <div v-if="dashboardLoading && hrStore.vales.length === 0" class="flex flex-col gap-3 p-4 sm:p-5">
        <USkeleton v-for="item in 5" :key="item" class="h-12 w-full rounded-lg" />
      </div>
      <div v-else-if="hrStore.vales.length === 0" class="rounded-xl border border-dashed border-default px-4 py-10 text-center">
        <span class="mx-auto flex size-11 items-center justify-center rounded-full bg-muted/50 text-muted">
          <UIcon name="i-lucide-receipt-text" class="size-5" />
        </span>
        <p class="mt-3 font-medium">Todavía no hay vales</p>
        <p class="mt-1 text-sm text-muted">Cuando registres uno, vas a poder seguir su estado desde acá.</p>
      </div>
      <ul v-else class="m-0 max-h-[360px] list-none divide-y divide-default overflow-y-auto overscroll-contain p-0" tabindex="0" aria-label="Vales recientes; desplazate para ver más movimientos">
        <li
          v-for="vale in hrStore.vales.slice(0, 20)"
          :key="vale.id"
          class="grid h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 transition-colors hover:bg-elevated/50 sm:px-5"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span class="hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex" :class="vale.party_type === 'PARTNER' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'">
              <UIcon name="i-lucide-receipt" class="size-4" />
            </span>
            <div class="min-w-0">
              <div class="flex min-w-0 items-baseline gap-2" :title="[vale.party?.name, vale.description].filter(Boolean).join(' · ')">
                <p class="max-w-full shrink-0 truncate text-sm font-medium lg:max-w-[45%]">{{ vale.party?.name ?? 'Sin contraparte' }}</p>
                <span v-if="vale.description" class="hidden min-w-0 truncate text-xs text-muted lg:block">{{ vale.description }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-muted" :title="valeTypeLabel(vale)">{{ fmtDate(vale.date) }} · {{ vale.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio' }} · #{{ vale.number }} · {{ valeTypeLabel(vale) }}</p>
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <p class="whitespace-nowrap text-sm font-semibold tabular-nums">{{ fmt(vale.amount, vale.currency_code) }}</p>
            <UBadge :label="valeStatusLabel(vale)" :color="HR_VALE_STATUS_COLORS[vale.status]" variant="subtle" size="xs" />
          </div>
        </li>
      </ul>
      <template v-if="hrStore.vales.length > 5" #footer>
        <p class="text-xs text-muted">Desplazate para ver los {{ Math.min(hrStore.vales.length, 20) }} movimientos recientes. El historial completo está en «Ver todos».</p>
      </template>
    </UCard>

    <CreateValeModal v-model:open="showCreateValeModal" @success="loadDashboard" />
    </div>
  </UPage>
</template>
