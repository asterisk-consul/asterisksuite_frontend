<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { valePeriodoColumns } from './vales-periodo.columns'
import { useRrhhTotals } from '~/modulos/erp/rrhh/composables/useRrhhTotals'
import RrhhTotalsCards from '~/components/rrhh/RrhhTotalsCards.vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)

const dateFrom = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`)
const dateTo = ref(today())
const filterType = ref<string | undefined>(undefined)
const activeTab = ref('todos')
const sorting = ref<SortingState>([])

async function loadReport() {
  await hrStore.fetchVales({
    ...(filterType.value ? { type: filterType.value } : {}),
  })
}

onMounted(() => loadReport())

watch([dateFrom, dateTo, filterType], () => loadReport())

// =========================
// COLUMNAS
// =========================

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = valePeriodoColumns({ onSortFieldSelect })

// =========================
// FILTROS POR PERÍODO
// =========================

const filteredVales = computed(() => {
  const result = vales.value.filter((v) => {
    const d = v.date?.split('T')[0] ?? v.date
    return d >= dateFrom.value && d <= dateTo.value
  })
  console.log('[vales-periodo] filteredVales:', result.length, 'items')
  return result
})

// =========================
// TOTALES (usando composable con getter)
// =========================

const allTotals = useRrhhTotals(() => filteredVales.value)
const pendingTotals = useRrhhTotals(() => filteredVales.value, { status: 'DRAFT' })
const confirmedTotals = useRrhhTotals(() => filteredVales.value, { status: 'CONFIRMED' })
const cancelledTotals = useRrhhTotals(() => filteredVales.value, { status: 'CANCELLED' })

// Asegurar que filteredItems siempre sea array
const safeAllItems = computed(() => Array.isArray(allTotals.filteredItems.value) ? allTotals.filteredItems.value : [])
const safePendingItems = computed(() => Array.isArray(pendingTotals.filteredItems.value) ? pendingTotals.filteredItems.value : [])
const safeConfirmedItems = computed(() => Array.isArray(confirmedTotals.filteredItems.value) ? confirmedTotals.filteredItems.value : [])
const safeCancelledItems = computed(() => Array.isArray(cancelledTotals.filteredItems.value) ? cancelledTotals.filteredItems.value : [])

// =========================
// FILTROS TABLA
// =========================

const filterFields: FilterField[] = [
  { id: 'party_name', label: 'Filtrar por persona...', class: 'w-40' },
  { id: 'type', label: 'Filtrar por tipo...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { label: 'Nº', value: 'number' },
  { label: 'Persona', value: 'party_name' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Fecha', value: 'date' }
]

// =========================
// HELPERS
// =========================

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const typeOptions = [
  { label: 'Sueldo', value: 'SUELDO' },
  { label: 'Adelanto', value: 'ADELANTO' },
  { label: 'Extras', value: 'EXTRAS' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Aporte', value: 'APORTE' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Préstamo', value: 'PRESTAMO' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Vales por período" description="Detalle de vales en un rango de fechas" />

    <!-- Filtros -->
    <div class="flex gap-3 flex-wrap items-end">
      <div class="space-y-1">
        <label class="text-xs text-muted">Desde</label>
        <UInput v-model="dateFrom" type="date" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted">Hasta</label>
        <UInput v-model="dateTo" type="date" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted">Tipo</label>
        <USelect v-model="filterType" :items="typeOptions" class="w-40" />
      </div>
    </div>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="[
      { label: 'Todos', value: 'todos', slot: 'todos' },
      { label: 'Pendientes', value: 'pendientes', slot: 'pendientes' },
      { label: 'Confirmados', value: 'confirmados', slot: 'confirmados' },
      { label: 'Anulados', value: 'anulados', slot: 'anulados' }
    ]" variant="link">

      <!-- TAB: TODOS -->
      <template #todos>
        <div class="space-y-4 pt-4">
          <RrhhTotalsCards
            :total-debit="allTotals.totalDebit.value"
            :total-credit="allTotals.totalCredit.value"
          />
          <LogisticaTable
            :loading="loading"
            :data="safeAllItems"
            :columns="columns"
            :filter-fields="filterFields"
            :sort-fields="sortFields"
            v-model:sorting="sorting"
          />
        </div>
      </template>

      <!-- TAB: PENDIENTES -->
      <template #pendientes>
        <div class="space-y-4 pt-4">
          <RrhhTotalsCards
            :total-debit="pendingTotals.totalDebit.value"
            :total-credit="pendingTotals.totalCredit.value"
            label="Pendientes"
          />
          <LogisticaTable
            :loading="loading"
            :data="safePendingItems"
            :columns="columns"
            :filter-fields="filterFields"
            :sort-fields="sortFields"
            v-model:sorting="sorting"
          />
        </div>
      </template>

      <!-- TAB: CONFIRMADOS -->
      <template #confirmados>
        <div class="space-y-4 pt-4">
          <RrhhTotalsCards
            :total-debit="confirmedTotals.totalDebit.value"
            :total-credit="confirmedTotals.totalCredit.value"
            label="Confirmados"
          />
          <LogisticaTable
            :loading="loading"
            :data="safeConfirmedItems"
            :columns="columns"
            :filter-fields="filterFields"
            :sort-fields="sortFields"
            v-model:sorting="sorting"
          />
        </div>
      </template>

      <!-- TAB: ANULADOS -->
      <template #anulados>
        <div class="space-y-4 pt-4">
          <RrhhTotalsCards
            :total-debit="cancelledTotals.totalDebit.value"
            :total-credit="cancelledTotals.totalCredit.value"
            label="Anulados"
          />
          <LogisticaTable
            :loading="loading"
            :data="safeCancelledItems"
            :columns="columns"
            :filter-fields="filterFields"
            :sort-fields="sortFields"
            v-model:sorting="sorting"
          />
        </div>
      </template>
    </UTabs>
  </UPage>
</template>
