<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const accounts = computed(() => hrStore.accounts)
const entries = computed(() => hrStore.currentEntries)
const currentAccount = computed(() => hrStore.currentAccount)
const loading = computed(() => hrStore.loading)

const selectedAccountId = ref('')

const people = ref<any[]>([])

async function loadPeople() {
  try {
    const accs = await hrStore.fetchAccounts()
    people.value = accs.map((a: any) => ({
      id: a.id,
      name: `${a.party?.name ?? 'Desconocido'} (${a.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio'})`,
    }))
  } catch (e) {
    console.error(e)
  }
}

async function loadEntries() {
  if (!selectedAccountId.value) return
  await hrStore.fetchAccountEntries(selectedAccountId.value)
}

onMounted(() => loadPeople())

watch(selectedAccountId, () => loadEntries())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

const entryTypeLabels: Record<string, string> = {
  VALE_DEBIT: 'Vale (Débito)',
  VALE_CREDIT: 'Vale (Crédito)',
  PAYMENT: 'Pago',
  COLLECTION: 'Cobro',
  ADJUSTMENT: 'Ajuste',
}

const columns = [
  { id: 'date', header: 'Fecha' },
  { id: 'type', header: 'Tipo' },
  { id: 'description', header: 'Descripción' },
  { id: 'amount', header: 'Monto' },
  { id: 'balance', header: 'Saldo' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Movimientos por persona" description="Historial de movimientos de cuenta corriente" />

    <!-- Selector de persona -->
    <div class="flex gap-3 items-end">
      <div class="space-y-1 flex-1 max-w-md">
        <label class="text-xs text-muted">Seleccionar persona</label>
        <USelect
          v-model="selectedAccountId"
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
        :class="Number(currentAccount.balance) >= 0 ? 'text-success' : 'text-error'"
      >
        {{ fmt(Number(currentAccount.balance)) }}
      </span>
    </div>

    <!-- Tabla de movimientos -->
    <UPageCard variant="subtle">
      <template #header>
        <h3 class="text-sm font-semibold">Movimientos</h3>
      </template>

      <div v-if="!selectedAccountId" class="text-center py-8 text-muted text-sm">
        Seleccioná una persona para ver sus movimientos.
      </div>

      <UTable v-else :data="entries" :columns="columns" :loading="loading">
        <template #date-cell="{ row }">
          {{ fmtDate(row.original.date) }}
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="entryTypeLabels[row.original.type] ?? row.original.type"
            :color="(row.original.type.includes('DEBIT') ? 'error' : row.original.type.includes('CREDIT') ? 'success' : 'neutral') as any"
            variant="subtle"
          />
        </template>

        <template #description-cell="{ row }">
          {{ row.original.description ?? '-' }}
        </template>

        <template #amount-cell="{ row }">
          <span
            class="font-medium"
            :class="row.original.type.includes('DEBIT') ? 'text-error' : 'text-success'"
          >
            {{ row.original.type.includes('DEBIT') ? '-' : '+' }}{{ fmt(Number(row.original.amount)) }}
          </span>
        </template>

        <template #balance-cell="{ row }">
          <span class="font-semibold">{{ fmt(Number(row.original.balance_after)) }}</span>
        </template>
      </UTable>
    </UPageCard>
  </UPage>
</template>
