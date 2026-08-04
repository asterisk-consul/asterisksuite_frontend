<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { saldoColumns } from './saldos.columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const { allAccounts, loading, fetchAll } = useCurrentAccounts()

const sorting = ref<SortingState>([])

onMounted(async () => {
  await fetchAll({ party_type: 'EMPLOYEE,PARTNER' })
})

// =========================
// COLUMNAS
// =========================

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = saldoColumns({ onSortFieldSelect })

// =========================
// FILTROS
// =========================

const filterFields: FilterField[] = [
  { id: 'party_name', label: 'Filtrar por nombre...', class: 'w-40' },
  { id: 'currency_code', label: 'Filtrar por moneda...', class: 'w-40' }
]

const sortFields: SortField[] = [
  { label: 'Nombre', value: 'party_name' },
  { label: 'Moneda', value: 'currency_code' },
  { label: 'Saldo', value: 'balance' }
]

// =========================
// HELPERS
// =========================

function fmt(n: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n ?? 0)
}

// Para empleados/socios: positivo = "A pagar" (empresa les debe)
// Para empleados/socios: negativo = "A cobrar" (ellos le deben a la empresa)
interface CurrencyBalance {
  balance: number
  count: number
}

const rrhhAccounts = computed(() =>
  allAccounts.value.filter(a => a.party_type === 'EMPLOYEE' || a.party_type === 'PARTNER')
)

const totalByCurrency = computed(() => {
  const map: Record<string, CurrencyBalance> = {}
  for (const a of rrhhAccounts.value) {
    const code = a.currency_code || 'ARS'
    if (!map[code]) map[code] = { balance: 0, count: 0 }
    map[code].balance -= Number(a.balance)
    map[code].count++
  }
  return map
})

const employeesByCurrency = computed(() => {
  const map: Record<string, CurrencyBalance> = {}
  for (const a of allAccounts.value.filter(a => a.party_type === 'EMPLOYEE')) {
    const code = a.currency_code || 'ARS'
    if (!map[code]) map[code] = { balance: 0, count: 0 }
    map[code].balance -= Number(a.balance)
    map[code].count++
  }
  return map
})

const partnersByCurrency = computed(() => {
  const map: Record<string, CurrencyBalance> = {}
  for (const a of allAccounts.value.filter(a => a.party_type === 'PARTNER')) {
    const code = a.currency_code || 'ARS'
    if (!map[code]) map[code] = { balance: 0, count: 0 }
    map[code].balance -= Number(a.balance)
    map[code].count++
  }
  return map
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Saldos CC RRHH" description="Resumen de saldos de cuentas corrientes" />

    <!-- Resumen -->
    <div class="space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Empleados -->
        <UPageCard variant="subtle">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium uppercase">Empleados (A pagar)</p>
            <template v-if="Object.keys(employeesByCurrency).length > 0">
              <div v-for="(data, currency) in employeesByCurrency" :key="currency" class="flex items-baseline gap-2">
                <p class="text-lg font-semibold text-error">
                  {{ fmt(data.balance, currency) }}
                </p>
                <span class="text-xs text-muted">{{ data.count }} cuentas</span>
              </div>
            </template>
            <p v-else class="text-lg font-semibold text-muted">$0.00</p>
          </div>
        </UPageCard>
        <!-- Socios -->
        <UPageCard variant="subtle">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium uppercase">Socios (A pagar)</p>
            <template v-if="Object.keys(partnersByCurrency).length > 0">
              <div v-for="(data, currency) in partnersByCurrency" :key="currency" class="flex items-baseline gap-2">
                <p class="text-lg font-semibold text-error">
                  {{ fmt(data.balance, currency) }}
                </p>
                <span class="text-xs text-muted">{{ data.count }} cuentas</span>
              </div>
            </template>
            <p v-else class="text-lg font-semibold text-muted">$0.00</p>
          </div>
        </UPageCard>
        <!-- Total -->
        <UPageCard variant="subtle">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium uppercase">Total (A pagar)</p>
            <template v-if="Object.keys(totalByCurrency).length > 0">
              <div v-for="(data, currency) in totalByCurrency" :key="currency" class="flex items-baseline gap-2">
                <p class="text-lg font-semibold text-error">
                  {{ fmt(data.balance, currency) }}
                </p>
                <span class="text-xs text-muted">{{ data.count }} cuentas</span>
              </div>
            </template>
            <p v-else class="text-lg font-semibold text-muted">$0.00</p>
          </div>
        </UPageCard>
      </div>
    </div>

    <!-- Tabla -->
    <LogisticaTable
      :loading="loading"
      :data="allAccounts"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
