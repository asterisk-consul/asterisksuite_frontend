<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import { useSalesReports } from '~/modulos/erp/sales-reports/composables/useSalesReports'
import type { SummaryFilters } from '~/modulos/erp/sales-reports/types/sales-reports.types'

const { byPointOfSaleData, loading, error, fetchByPointOfSale } = useSalesReports()

const filters = ref<SummaryFilters>({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

const search = ref('')
const sortCol = ref<string>('count')
const sortDir = ref<1 | -1>(-1)

async function fetchData() {
  await fetchByPointOfSale(filters.value)
}

const filtered = computed(() => {
  if (!byPointOfSaleData.value) return []
  const q = search.value.toLowerCase()
  return byPointOfSaleData.value.data
    .filter(r => r.point_of_sale.toLowerCase().includes(q))
    .sort((a, b) => {
      const av = (a as any)[sortCol.value]
      const bv = (b as any)[sortCol.value]
      if (typeof av === 'string') return sortDir.value * av.localeCompare(bv)
      return sortDir.value * ((av ?? 0) - (bv ?? 0))
    })
})

function setSort(col: string) {
  if (sortCol.value === col) sortDir.value = sortDir.value === -1 ? 1 : -1
  else {
    sortCol.value = col
    sortDir.value = -1
  }
}

function sortIcon(col: string) {
  if (sortCol.value !== col) return '↕'
  return sortDir.value === -1 ? '↓' : '↑'
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

function exportCSV() {
  if (!byPointOfSaleData.value) return
  const headers = ['Punto de Venta', 'Cantidad OV', 'Total', 'Desglose por tipo']
  const rows = filtered.value.map(r => [
    r.point_of_sale,
    r.count,
    r.total,
    r.byDocumentType.map(d => `${d.code}: ${d.count}`).join(', ')
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'ventas-por-pv.csv'
  a.click()
}

onMounted(fetchData)
</script>

<template>
  <UDashboardPanel id="ventas-pv-report" :ui="{ body: 'overflow-y-auto' }">
    <template #header>
      <UDashboardNavbar title="Ventas por Punto de Venta">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Exportar CSV"
            icon="i-heroicons-arrow-down-tray"
            color="neutral"
            variant="outline"
            size="sm"
            @click="exportCSV"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-5 p-4 min-h-0 h-full">
        <!-- Filtros y métricas -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-5">
          <!-- Filtros -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Desde</span>
              <UInput v-model="filters.startDate" type="date" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Hasta</span>
              <UInput v-model="filters.endDate" type="date" size="sm" />
            </div>
            <UButton
              size="sm"
              color="primary"
              variant="solid"
              icon="i-heroicons-arrow-path"
              :loading="loading"
              @click="fetchData"
            >
              Actualizar
            </UButton>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-triangle"
          />

          <!-- Métricas -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <template v-if="loading">
              <div v-for="i in 3" :key="i" class="rounded-lg bg-gray-100 dark:bg-gray-800 h-20 animate-pulse" />
            </template>
            <template v-else-if="byPointOfSaleData">
              <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-1">
                <span class="text-[10px] text-gray-400 uppercase tracking-wider">Total OV</span>
                <span class="text-sm font-medium leading-tight tabular-nums">{{ byPointOfSaleData.totalCount }}</span>
                <span class="text-[10px] text-gray-400">documentos</span>
              </div>
              <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-1">
                <span class="text-[10px] text-gray-400 uppercase tracking-wider">Monto Total</span>
                <span class="text-sm font-medium leading-tight tabular-nums">{{ fmt(byPointOfSaleData.grandTotal) }}</span>
                <span class="text-[10px] text-gray-400">pesos</span>
              </div>
              <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-1">
                <span class="text-[10px] text-gray-400 uppercase tracking-wider">Puntos de Venta</span>
                <span class="text-sm font-medium leading-tight tabular-nums">{{ byPointOfSaleData.totalPV }}</span>
                <span class="text-[10px] text-gray-400">activos</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Tabla -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Detalle por punto de venta
            </p>
            <span class="text-xs text-gray-400">
              {{ filtered.length }} de {{ byPointOfSaleData?.data.length ?? 0 }} PV
            </span>
          </div>

          <UInput
            v-model="search"
            placeholder="Buscar por PV..."
            icon="i-heroicons-magnifying-glass"
            size="sm"
          />

          <div class="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                  <th class="th" style="width: 120px" @click="setSort('point_of_sale')">
                    Punto de Venta
                    <span :class="['sort', sortCol === 'point_of_sale' && 'active']">{{ sortIcon('point_of_sale') }}</span>
                  </th>
                  <th class="th tc" style="width: 100px" @click="setSort('count')">
                    Cantidad OV
                    <span :class="['sort', sortCol === 'count' && 'active']">{{ sortIcon('count') }}</span>
                  </th>
                  <th class="th tr" style="width: 150px" @click="setSort('total')">
                    Total
                    <span :class="['sort', sortCol === 'total' && 'active']">{{ sortIcon('total') }}</span>
                  </th>
                  <th class="th" style="width: 200px">Desglose por tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="4" class="text-center py-10 text-gray-400">Cargando...</td>
                </tr>
                <tr v-else-if="!filtered.length">
                  <td colspan="4" class="text-center py-10 text-gray-400">Sin resultados</td>
                </tr>
                <tr
                  v-for="row in filtered"
                  :key="row.point_of_sale"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td class="td font-mono font-medium">{{ row.point_of_sale }}</td>
                  <td class="td tc tabular-nums">{{ row.count }}</td>
                  <td class="td tr tabular-nums">{{ fmt(row.total) }}</td>
                  <td class="td">
                    <div class="flex flex-wrap gap-1">
                      <UBadge
                        v-for="dt in row.byDocumentType"
                        :key="dt.code"
                        size="xs"
                        variant="soft"
                        color="info"
                      >
                        {{ dt.code }}: {{ dt.count }}
                      </UBadge>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  color: rgb(156 163 175);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.th:hover {
  color: rgb(107 114 128);
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.td {
  padding: 7px 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sort {
  font-size: 9px;
  margin-left: 2px;
  opacity: 0.3;
}
.sort.active {
  opacity: 1;
}
</style>
