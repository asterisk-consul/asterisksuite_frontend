<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const accounts = computed(() => hrStore.accounts)
const loading = computed(() => hrStore.loading)

const filterType = ref<string | undefined>(undefined)

async function loadAccounts() {
  await hrStore.fetchAccounts({
    ...(filterType.value ? { party_type: filterType.value } : {}),
  })
}

onMounted(() => loadAccounts())

watch(filterType, () => loadAccounts())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const totalBalance = computed(() =>
  accounts.value.reduce((sum, a) => sum + Number(a.balance), 0)
)

const employeesBalance = computed(() =>
  accounts.value
    .filter((a) => a.party_type === 'EMPLOYEE')
    .reduce((sum, a) => sum + Number(a.balance), 0)
)

const partnersBalance = computed(() =>
  accounts.value
    .filter((a) => a.party_type === 'PARTNER')
    .reduce((sum, a) => sum + Number(a.balance), 0)
)

const columns = [
  { id: 'name', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'currency', header: 'Moneda' },
  { id: 'balance', header: 'Saldo' },
]

const typeOptions = [
  { label: 'Empleados', value: 'EMPLOYEE' },
  { label: 'Socios', value: 'PARTNER' },
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Saldos CC RRHH" description="Resumen de saldos de cuentas corrientes" />

    <!-- Filtros -->
    <div class="flex gap-2">
      <USelect v-model="filterType" :items="typeOptions" placeholder="Tipo" class="w-40" />
    </div>

    <!-- Resumen -->
    <div class="grid grid-cols-3 gap-4">
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Empleados</p>
          <p class="text-xl font-semibold" :class="employeesBalance >= 0 ? 'text-success' : 'text-error'">
            {{ fmt(employeesBalance) }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Socios</p>
          <p class="text-xl font-semibold" :class="partnersBalance >= 0 ? 'text-success' : 'text-error'">
            {{ fmt(partnersBalance) }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Total</p>
          <p class="text-xl font-semibold" :class="totalBalance >= 0 ? 'text-success' : 'text-error'">
            {{ fmt(totalBalance) }}
          </p>
        </div>
      </UPageCard>
    </div>

    <!-- Tabla -->
    <UPageCard variant="subtle">
      <UTable :data="accounts" :columns="columns" :loading="loading">
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.party?.name ?? '-' }}</span>
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="row.original.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio'"
            :color="row.original.party_type === 'EMPLOYEE' ? 'info' : 'warning'"
            variant="subtle"
          />
        </template>

        <template #currency-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.currency_code }}</span>
        </template>

        <template #balance-cell="{ row }">
          <span
            class="font-semibold"
            :class="Number(row.original.balance) >= 0 ? 'text-success' : 'text-error'"
          >
            {{ fmt(Number(row.original.balance)) }}
          </span>
        </template>
      </UTable>
    </UPageCard>
  </UPage>
</template>
