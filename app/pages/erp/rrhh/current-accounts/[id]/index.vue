<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const route = useRoute()
const hrStore = useHrStore()

const account = computed(() => hrStore.currentAccount)
const entries = computed(() => hrStore.currentEntries)
const loading = computed(() => hrStore.loading)

onMounted(async () => {
  await hrStore.fetchAccountEntries(route.params.id as string)
})

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

const entryTypeColors: Record<string, string> = {
  VALE_DEBIT: 'error',
  VALE_CREDIT: 'success',
  PAYMENT: 'warning',
  COLLECTION: 'info',
  ADJUSTMENT: 'neutral',
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
    <AppPageHeader
      :title="`Cuenta Corriente — ${account?.party?.name ?? '...'}`"
      :description="`Saldo: ${fmt(Number(account?.balance ?? 0))}`"
    />

    <UPageCard variant="subtle">
      <UTable :data="entries" :columns="columns" :loading="loading">
        <template #date-cell="{ row }">
          {{ fmtDate(row.original.date) }}
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="entryTypeLabels[row.original.type] ?? row.original.type"
            :color="(entryTypeColors[row.original.type] ?? 'neutral') as any"
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
