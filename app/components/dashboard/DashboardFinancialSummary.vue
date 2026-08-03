<script setup lang="ts">
import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'

defineProps<{
  loading?: boolean
}>()

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num)
}

const { dashboard: treasuryData, loading: treasuryLoading, fetchDashboard } = useTreasuryReports()

const statCards = computed(() => {
  const d = treasuryData.value
  if (!d) return []

  const totalBankBalance = (d.bank_accounts ?? []).reduce((sum, a) => (Number(a.balance) || 0) + sum, 0)

  const cashBoxesTotal = (d.cash_boxes ?? []).reduce((sum, cb) => (Number(cb.balance) || 0) + sum, 0)

  const pendingOwnChecks = d.summary?.pending_own_checks ?? 0
  const pendingThirdPartyChecks = d.summary?.pending_third_party_checks ?? 0

  return [
    {
      label: 'Saldo bancario',
      value: formatCurrency(totalBankBalance),
      icon: 'i-lucide-landmark',
      color: 'primary',
      to: '/erp/treasury/bank-accounts',
    },
    {
      label: 'Saldo cajas',
      value: formatCurrency(cashBoxesTotal),
      icon: 'i-lucide-wallet',
      color: 'success',
      to: '/erp/treasury/cash-boxes',
    },
    {
      label: 'Cheques a cobrar',
      value: `${pendingThirdPartyChecks} pendientes`,
      icon: 'i-lucide-arrow-down-left',
      color: 'info',
      to: '/erp/treasury/checks',
    },
    {
      label: 'Cheques a pagar',
      value: `${pendingOwnChecks} pendientes`,
      icon: 'i-lucide-arrow-up-right',
      color: 'warning',
      to: '/erp/treasury/checks',
    },
  ]
})
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-landmark" class="size-5 text-primary" />
        <h3 class="text-sm font-semibold">Finanzas</h3>
      </div>
    </template>

    <div v-if="treasuryLoading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-lg" />
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLink
        v-for="stat in statCards"
        :key="stat.label"
        :to="stat.to"
        class="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
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
            <p class="text-sm font-bold mt-0.5 truncate">{{ stat.value }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </UPageCard>
</template>
