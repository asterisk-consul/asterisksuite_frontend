<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const accounts = computed(() => hrStore.accounts)
const loading = computed(() => hrStore.loading)

const filterType = ref<string>('')

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

const columns = [
  { id: 'name', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'currency', header: 'Moneda' },
  { id: 'balance', header: 'Saldo' },
  { id: 'actions', header: '' },
]

const typeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Empleados', value: 'EMPLOYEE' },
  { label: 'Socios', value: 'PARTNER' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Ctas Ctes RRHH" description="Cuentas corrientes de empleados y socios" />

    <!-- Filtros -->
    <div class="flex gap-2 flex-wrap">
      <USelect v-model="filterType" :items="typeOptions" placeholder="Tipo" class="w-40" />
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

        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-eye"
            variant="ghost"
            color="neutral"
            size="sm"
            :to="`/erp/treasury/rrhh/current-accounts/${row.original.id}`"
          />
        </template>
      </UTable>
    </UPageCard>
  </UPage>
</template>
