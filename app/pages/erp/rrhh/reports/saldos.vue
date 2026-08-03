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

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

// Para empleados/socios: positivo = "A pagar" (empresa les debe)
// Para empleados/socios: negativo = "A cobrar" (ellos le deben a la empresa)
const totalBalance = computed(() =>
  allAccounts.value
    .filter(a => a.party_type === 'EMPLOYEE' || a.party_type === 'PARTNER')
    .reduce((sum, a) => sum - Number(a.balance), 0)
)

const employeesBalance = computed(() =>
  allAccounts.value
    .filter(a => a.party_type === 'EMPLOYEE')
    .reduce((sum, a) => sum - Number(a.balance), 0)
)

const partnersBalance = computed(() =>
  allAccounts.value
    .filter(a => a.party_type === 'PARTNER')
    .reduce((sum, a) => sum - Number(a.balance), 0)
)
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Saldos CC RRHH" description="Resumen de saldos de cuentas corrientes" />

    <!-- Resumen -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Empleados (A pagar)</p>
          <p class="text-xl font-semibold text-error">
            {{ fmt(employeesBalance) }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Socios (A pagar)</p>
          <p class="text-xl font-semibold text-error">
            {{ fmt(partnersBalance) }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Total (A pagar)</p>
          <p class="text-xl font-semibold text-error">
            {{ fmt(totalBalance) }}
          </p>
        </div>
      </UPageCard>
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
