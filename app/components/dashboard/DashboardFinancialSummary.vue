<script setup lang="ts">
import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'

const props = defineProps<{
  loading?: boolean
}>()

const loadError = ref(false)

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num)
}

const { dashboard: treasuryData, loading: treasuryLoading, fetchDashboard } = useTreasuryReports()

const isLoading = computed(() => props.loading || treasuryLoading.value)

const loadFinancialData = async () => {
  loadError.value = false
  try {
    await fetchDashboard(30)
  } catch {
    loadError.value = true
  }
}

onMounted(loadFinancialData)

const sumByCurrency = (rows: Array<{ balance: number; currency_code?: string }>) => rows.reduce<Record<string, number>>((totals, row) => {
  const currency = row.currency_code || 'ARS'
  totals[currency] = (totals[currency] ?? 0) + (Number(row.balance) || 0)
  return totals
}, {})

const balances = computed(() => ({
  banks: sumByCurrency(treasuryData.value?.bank_accounts ?? []),
  cash: sumByCurrency(treasuryData.value?.cash_boxes ?? []),
}))

const secondaryBalances = (values: Record<string, number>) => Object.entries(values)
  .filter(([currency]) => currency !== 'ARS')
  .map(([currency, amount]) => formatCurrency(amount, currency))
  .join(' · ')

const statCards = computed(() => {
  const d = treasuryData.value
  if (!d) return []

  const pendingOwnChecks = d.summary?.pending_own_checks ?? 0
  const pendingThirdPartyChecks = d.summary?.pending_third_party_checks ?? 0

  return [
    {
      label: 'Saldo bancario',
      value: formatCurrency(balances.value.banks.ARS ?? 0),
      detail: secondaryBalances(balances.value.banks) || `${d.bank_accounts.length} cuentas`,
      icon: 'i-lucide-landmark',
      color: 'primary',
      to: '/erp/treasury/bank-accounts',
    },
    {
      label: 'Saldo cajas',
      value: formatCurrency(balances.value.cash.ARS ?? 0),
      detail: secondaryBalances(balances.value.cash) || `${d.cash_boxes.length} cajas`,
      icon: 'i-lucide-wallet',
      color: 'success',
      to: '/erp/treasury/cash-boxes',
    },
    {
      label: 'Cheques a cobrar',
      value: `${pendingThirdPartyChecks} pendientes`,
      detail: 'Cheques de terceros',
      icon: 'i-lucide-arrow-down-left',
      color: 'info',
      to: '/erp/treasury/checks',
    },
    {
      label: 'Cheques a pagar',
      value: `${pendingOwnChecks} pendientes`,
      detail: 'Cheques propios',
      icon: 'i-lucide-arrow-up-right',
      color: 'warning',
      to: '/erp/treasury/checks',
    },
  ]
})
</script>

<template>
  <UPageCard variant="subtle" class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-landmark" class="size-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold">Finanzas</h3>
            <p class="text-xs text-muted">Disponibilidad y compromisos</p>
          </div>
        </div>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs" :loading="treasuryLoading" aria-label="Actualizar finanzas" @click="loadFinancialData" />
      </div>
    </template>

    <div v-if="isLoading" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-lg" />
    </div>

    <div v-else-if="loadError" class="flex flex-col items-center py-7 text-center">
      <UIcon name="i-lucide-cloud-off" class="mb-2 size-6 text-muted" />
      <p class="text-sm font-medium">No pudimos cargar las finanzas</p>
      <p class="mt-1 text-xs text-muted">Revisá la conexión y volvé a intentar.</p>
      <UButton label="Reintentar" variant="ghost" size="xs" class="mt-2" @click="loadFinancialData" />
    </div>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="stat in statCards"
        :key="stat.label"
        :to="stat.to"
        class="group block rounded-xl border border-default bg-muted/20 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center size-10 rounded-lg shrink-0"
            :class="{
              'bg-primary/10 text-primary': stat.color === 'primary',
              'bg-success/10 text-success': stat.color === 'success',
              'bg-warning/10 text-warning': stat.color === 'warning',
              'bg-info/10 text-info': stat.color === 'info',
            }"
          >
            <UIcon :name="stat.icon" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-muted font-medium">{{ stat.label }}</p>
            <p class="mt-0.5 truncate text-base font-bold tabular-nums">{{ stat.value }}</p>
            <p class="mt-0.5 truncate text-[11px] text-muted">{{ stat.detail }}</p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="ml-auto size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </NuxtLink>
    </div>

    <div v-if="!isLoading && !loadError && treasuryData?.summary" class="mt-4 grid grid-cols-2 gap-3 border-t border-default pt-4">
      <div class="rounded-xl bg-error/5 px-3 py-2">
        <p class="text-[11px] font-medium uppercase tracking-wide text-muted">Pagos registrados</p>
        <p class="mt-1 text-sm font-semibold text-error">{{ formatCurrency(treasuryData.summary.total_payments) }}</p>
      </div>
      <div class="rounded-xl bg-success/5 px-3 py-2">
        <p class="text-[11px] font-medium uppercase tracking-wide text-muted">Cobros registrados</p>
        <p class="mt-1 text-sm font-semibold text-success">{{ formatCurrency(treasuryData.summary.total_collections) }}</p>
      </div>
    </div>
  </UPageCard>
</template>
