<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'
import { treasuryMovementColumns, MOVEMENT_TYPE_CONFIG } from '~/modulos/erp/treasury-reports/columns'
import { useCompanyRole } from '~/composables/useCompanyRole'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { movements, loading, fetchMovements } = useTreasuryReports()
const { isOwnerOrAdmin } = useCompanyRole()

const sorting = ref<SortingState>([])
const error = ref<string | null>(null)

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

onMounted(async () => {
  try {
    await fetchMovements()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al cargar movimientos'
  }
})

const columns = treasuryMovementColumns({
  onSortFieldSelect
})

const filterFields = computed<FilterField[]>(() => {
  const base: FilterField[] = [
    { id: 'source_name', label: 'Filtrar por nombre...', class: 'w-48' },
    { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
  ]
  if (isOwnerOrAdmin.value) {
    base.push({ id: 'type', label: 'Filtrar por tipo...', class: 'w-40' })
  }
  return base
})

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Origen', value: 'source' },
  { label: 'Nombre', value: 'source_name' },
  { label: 'Usuario', value: 'user_name' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Moneda', value: 'currency_code' }
]

const formatCurrency = (amount: number, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount)
}

const totalIn = computed(() =>
  movements.value
    .filter((m) => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'in')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
)

const totalOut = computed(() =>
  movements.value
    .filter((m) => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'out')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
)

const netBalance = computed(() => totalIn.value - totalOut.value)

const typeDistribution = computed(() => {
  const map = new Map<string, { count: number; total: number }>()
  for (const m of movements.value) {
    const config = MOVEMENT_TYPE_CONFIG[m.type]
    const label = config?.label ?? m.type
    const existing = map.get(label) || { count: 0, total: 0 }
    existing.count++
    existing.total += Number(m.amount) || 0
    map.set(label, existing)
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

const pieChartData = computed(() => {
  const colors = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']
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
        data: typeDistribution.value.map((d, i) => ({
          value: d.total,
          name: d.name,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }
    ]
  }
})

const barChartData = computed(() => {
  const labels = typeDistribution.value.map((d) => d.name)
  const values = typeDistribution.value.map((d) => d.total)
  const colors = typeDistribution.value.map((d) => {
    const config = Object.values(MOVEMENT_TYPE_CONFIG).find((c) => c.label === d.name)
    return config?.color === 'success' ? '#22c55e' : config?.color === 'error' ? '#ef4444' : '#3b82f6'
  })

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 0, right: 0, top: 10, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 10, rotate: 30 }
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        type: 'bar',
        data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
        barWidth: '60%'
      }
    ]
  }
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Reporte de Movimientos" description="Resumen de movimientos bancarios y de cajas" />

    <UAlert v-if="error" icon="i-lucide-alert-triangle" color="error" variant="subtle" :title="error" />

    <!-- STATS (always visible) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Ingresos</p>
            <p class="text-lg font-bold text-success">{{ formatCurrency(totalIn) }}</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-up-right" class="size-5 text-error" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Egresos</p>
            <p class="text-lg font-bold text-error">{{ formatCurrency(totalOut) }}</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div
            class="size-10 rounded-lg flex items-center justify-center shrink-0"
            :class="netBalance >= 0 ? 'bg-primary/10' : 'bg-warning/10'"
          >
            <UIcon name="i-lucide-scale" class="size-5" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Saldo neto</p>
            <p class="text-lg font-bold" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'">
              {{ formatCurrency(netBalance) }}
            </p>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- CHARTS (admin/owner only) -->
    <template v-if="isOwnerOrAdmin">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
        <UPageCard variant="subtle">
          <template #header>
            <h3 class="text-sm font-semibold">Distribución por tipo</h3>
          </template>
          <div v-if="typeDistribution.length === 0" class="text-center py-8 text-muted text-sm">
            No hay datos para mostrar
          </div>
          <ClientOnly>
            <VChart :option="pieChartData" :style="{ height: '280px', width: '100%' }" autoresize />
          </ClientOnly>
        </UPageCard>

        <UPageCard variant="subtle">
          <template #header>
            <h3 class="text-sm font-semibold">Totales por tipo</h3>
          </template>
          <div v-if="typeDistribution.length === 0" class="text-center py-8 text-muted text-sm">
            No hay datos para mostrar
          </div>
          <ClientOnly>
            <VChart :option="barChartData" :style="{ height: '280px', width: '100%' }" autoresize />
          </ClientOnly>
        </UPageCard>
      </div>
    </template>

    <!-- TABLE -->
    <UPageCard variant="subtle">
      <template #header>
        <h3 class="text-sm font-semibold">Detalle de movimientos</h3>
      </template>
      <div class="overflow-x-auto">
        <LogisticaTable
          :loading="loading"
          :data="movements"
          :columns="columns"
          :filter-fields="filterFields"
          :sort-fields="sortFields"
          v-model:sorting="sorting"
        />
      </div>
    </UPageCard>
  </UPage>
</template>
