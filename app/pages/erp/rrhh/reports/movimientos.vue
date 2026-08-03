<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { movimientoColumns } from './movimientos.columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const { statement, entries: storeEntries, loading, fetchStatement, fetchEntries } = useCurrentAccounts()

const selectedPartyId = ref('')
const sorting = ref<SortingState>([])

const people = ref<any[]>([])

// =========================
// CARGAR PERSONAS
// =========================

async function loadPeople() {
  try {
    const [employees, partners] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners')
    ])
    people.value = [
      ...employees.map((e: any) => ({
        id: e.party_id ?? e.id,
        name: `${e.first_name} ${e.last_name}`,
        type: 'EMPLOYEE'
      })),
      ...partners.map((p: any) => ({
        id: p.party_id ?? p.id,
        name: `${p.first_name} ${p.last_name}`,
        type: 'PARTNER'
      }))
    ]
  } catch (e) {
    console.error('[Movimientos] Error cargando personas:', e)
  }
}

// =========================
// CARGAR MOVIMIENTOS
// =========================

const currentAccount = computed(() => statement.value?.account ?? null)

const entries = computed(() => {
  const fromStatement = statement.value?.entries ?? []
  const fromStore = storeEntries.value ?? []
  const list = fromStatement.length > 0 ? fromStatement : fromStore
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

async function loadEntries() {
  if (!selectedPartyId.value) return
  try {
    console.log('[Movimientos] Cargando entries para party:', selectedPartyId.value)
    await fetchEntries(selectedPartyId.value)
    console.log('[Movimientos] Entries cargados:', entries.value.length)
  } catch (e) {
    console.error('[Movimientos] Error cargando entries:', e)
  }
}

onMounted(async () => {
  await loadPeople()
})

watch(selectedPartyId, () => loadEntries())

// =========================
// COLUMNAS
// =========================

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = movimientoColumns({ onSortFieldSelect })

// =========================
// FILTROS
// =========================

const filterFields: FilterField[] = [
  { id: 'type', label: 'Filtrar por tipo...', class: 'w-40' },
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Saldo', value: 'balance_after' }
]

// =========================
// HELPERS
// =========================

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Movimientos por persona" description="Historial de movimientos de cuenta corriente" />

    <!-- Selector de persona -->
    <div class="flex gap-3 items-end">
      <div class="space-y-1 flex-1 max-w-md">
        <label class="text-xs text-muted">Seleccionar persona</label>
        <USelectMenu
          v-model="selectedPartyId"
          :items="people.map(p => ({ label: p.name, value: p.id }))"
          placeholder="Buscar persona..."
        />
      </div>
    </div>

    <!-- Info de cuenta -->
    <div v-if="currentAccount" class="flex items-center gap-4">
      <span class="text-sm text-muted">Saldo actual:</span>
      <span
        class="text-lg font-semibold"
        :class="Number(currentAccount.balance) >= 0 ? 'text-error' : 'text-success'"
      >
        {{ fmt(Number(currentAccount.balance)) }}
      </span>
    </div>

    <!-- Tabla de movimientos -->
    <LogisticaTable
      :loading="loading"
      :data="entries"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
