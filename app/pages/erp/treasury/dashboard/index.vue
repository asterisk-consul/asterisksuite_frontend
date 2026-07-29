<script setup lang="ts">
definePageMeta({
  layout: 'fabricacion',
  middleware: ['auth']
})

import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useChecks } from '~/modulos/erp/checks/composables/useChecks'

const { dashboard, fetchDashboard, loading: reportsLoading } = useTreasuryReports()
const { bankAccounts, init: fetchBankAccounts } = useBankAccounts()
const { cashBoxes, init: fetchCashBoxes } = useCashBoxes()
const { checks, init: fetchChecks } = useChecks()

onMounted(async () => {
  await Promise.allSettled([
    fetchDashboard().catch(() => {}),
    fetchBankAccounts().catch(() => {}),
    fetchCashBoxes().catch(() => {}),
    fetchChecks().catch(() => {})
  ])
})

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(num)
}

const pendingOwnChecks = computed(() => checks.value.filter((c) => c.status === 'PENDING' && c.is_own))

const pendingThirdPartyChecks = computed(() => checks.value.filter((c) => c.status === 'PENDING' && !c.is_own))

const totalOwnCheckAmount = computed(() => pendingOwnChecks.value.reduce((sum, c) => (Number(c.amount) || 0) + sum, 0))

const totalThirdPartyCheckAmount = computed(() =>
  pendingThirdPartyChecks.value.reduce((sum, c) => (Number(c.amount) || 0) + sum, 0)
)

const statCards = computed(() => {
  const d = dashboard.value
  if (!d) return []

  const totalBankBalance = (d.bank_accounts ?? []).reduce((sum, a) => (Number(a.balance) || 0) + sum, 0)

  const cashBoxesByCurrency: Record<string, number> = {}
  for (const cb of (d.cash_boxes ?? [])) {
    const code = cb.currency_code || 'ARS'
    cashBoxesByCurrency[code] = (cashBoxesByCurrency[code] || 0) + (Number(cb.balance) || 0)
  }
  const cashBoxesTotal = Object.values(cashBoxesByCurrency).reduce((s, v) => s + v, 0)

  return [
    {
      label: 'Saldo bancario',
      value: formatCurrency(totalBankBalance),
      icon: 'i-lucide-landmark',
      color: 'primary' as const,
      to: '/erp/treasury/bank-accounts'
    },
    {
      label: 'Saldo cajas',
      value: Object.entries(cashBoxesByCurrency)
        .map(([c, a]) => formatCurrency(a, c))
        .join(' | '),
      sub: cashBoxesTotal > 0 ? `${Object.keys(cashBoxesByCurrency).length} moneda(s)` : 'Sin saldos',
      icon: 'i-lucide-wallet',
      color: 'success' as const,
      to: '/erp/treasury/cash-boxes'
    },
    {
      label: 'A cobrar',
      value: `${pendingThirdPartyChecks.value.length} cheques`,
      sub: formatCurrency(totalThirdPartyCheckAmount.value),
      icon: 'i-lucide-arrow-down-left',
      color: 'info' as const,
      to: '/erp/treasury/checks'
    },
    {
      label: 'A pagar',
      value: `${pendingOwnChecks.value.length} cheques`,
      sub: formatCurrency(totalOwnCheckAmount.value),
      icon: 'i-lucide-arrow-up-right',
      color: 'warning' as const,
      to: '/erp/treasury/checks'
    }
  ]
})

const quickActions = [
  { label: 'Nuevo pago', icon: 'i-lucide-send', to: '/erp/treasury/payments/create', color: 'primary' as const },
  { label: 'Nuevo cheque', icon: 'i-lucide-square-plus', to: '/erp/treasury/checks/create', color: 'warning' as const },
  { label: 'Transferencia caja', icon: 'i-lucide-arrow-left-right', to: '/erp/treasury/cash-box-transfers', color: 'info' as const },
  { label: 'Cuentas corrientes', icon: 'i-lucide-file-text', to: '/erp/treasury/current-accounts', color: 'warning' as const },
  { label: 'Cuentas bancarias', icon: 'i-lucide-landmark', to: '/erp/treasury/bank-accounts', color: 'primary' as const },
  { label: 'Cajas', icon: 'i-lucide-wallet', to: '/erp/treasury/cash-boxes', color: 'success' as const },
  { label: 'Cheques', icon: 'i-lucide-square-check', to: '/erp/treasury/checks', color: 'info' as const },
  { label: 'Pagos y cobros', icon: 'i-lucide-hand-coins', to: '/erp/treasury/payments', color: 'secondary' as const },
  { label: 'Cuentas contables', icon: 'i-lucide-calculator', to: '/erp/contabilidad/accounts', color: 'primary' as const },
  { label: 'Conceptos bancarios', icon: 'i-lucide-receipt', to: '/erp/treasury/bank-concepts', color: 'info' as const },
  { label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/erp/treasury/reports', color: 'success' as const },
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <UPageHeader title="Dashboard Tesorería" description="Resumen general de la situación financiera" />

    <!-- STAT CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
      <NuxtLink v-for="stat in statCards" :key="stat.label" :to="stat.to" class="block">
        <UPageCard
          variant="subtle"
          class="hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex items-center justify-center size-12 rounded-xl shrink-0"
              :class="{
                'bg-primary/10 text-primary': stat.color === 'primary',
                'bg-success/10 text-success': stat.color === 'success',
                'bg-warning/10 text-warning': stat.color === 'warning',
                'bg-info/10 text-info': stat.color === 'info'
              }"
            >
              <UIcon :name="stat.icon" class="size-6" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted font-medium uppercase tracking-wide">{{ stat.label }}</p>
              <p class="text-xl font-bold mt-0.5">{{ stat.value }}</p>
              <p v-if="stat.sub" class="text-xs text-muted mt-0.5">{{ stat.sub }}</p>
            </div>
          </div>
        </UPageCard>
      </NuxtLink>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="flex flex-wrap items-center gap-2">
      <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to">
        <UButton :label="action.label" :icon="action.icon" :color="action.color" variant="outline" size="sm" />
      </NuxtLink>
    </div>

    <!-- BANK ACCOUNTS + CASH BOXES -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      <!-- BANK ACCOUNTS -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-landmark" class="size-4 text-primary" />
              Cuentas Bancarias
            </h3>
            <UButton label="Ver todas" variant="ghost" size="xs" to="/erp/treasury/bank-accounts" />
          </div>
        </template>
        <div v-if="bankAccounts.length === 0" class="text-center py-8 text-muted text-sm">
          No hay cuentas bancarias registradas
        </div>
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="account in bankAccounts"
            :key="account.id"
            :to="`/erp/treasury/bank-accounts/${account.id}`"
            class="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-landmark" class="size-4 text-primary" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ account.name }}</p>
                <p class="text-xs text-muted truncate">{{ account.bank_name }} · {{ account.currency_code }}</p>
              </div>
            </div>
            <span class="text-sm font-semibold shrink-0 ml-3">
              {{ formatCurrency(account.balance, account.currency_code) }}
            </span>
          </NuxtLink>
        </div>
      </UPageCard>

      <!-- CASH BOXES -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-wallet" class="size-4 text-success" />
              Cajas
            </h3>
            <UButton label="Ver todas" variant="ghost" size="xs" to="/erp/treasury/cash-boxes" />
          </div>
        </template>
        <div v-if="cashBoxes.length === 0" class="text-center py-8 text-muted text-sm">No hay cajas registradas</div>
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="box in cashBoxes"
            :key="box.id"
            :to="`/erp/treasury/cash-boxes/${box.id}`"
            class="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-wallet" class="size-4 text-success" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ box.name }}</p>
                <p class="text-xs text-muted truncate">{{ box.type }}</p>
              </div>
            </div>
            <UBadge
              :label="box.status === 'OPEN' ? 'Abierta' : 'Cerrada'"
              :color="box.status === 'OPEN' ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
            />
          </NuxtLink>
        </div>
      </UPageCard>
    </div>

    <!-- PENDING CHECKS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- A COBRAR -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-arrow-down-left" class="size-4 text-info" />
              Cheques a cobrar
              <UBadge
                v-if="pendingThirdPartyChecks.length > 0"
                :label="`${pendingThirdPartyChecks.length}`"
                color="info"
                variant="soft"
                size="xs"
              />
            </h3>
            <UButton label="Ver todos" variant="ghost" size="xs" to="/erp/treasury/checks" />
          </div>
        </template>
        <div v-if="pendingThirdPartyChecks.length === 0" class="text-center py-8 text-muted text-sm">
          No hay cheques de terceros pendientes
        </div>
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="check in pendingThirdPartyChecks.slice(0, 5)"
            :key="check.id"
            :to="`/erp/treasury/checks/${check.id}/edit`"
            class="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-square-check" class="size-4 text-info" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">N° {{ check.check_number }}</p>
                <p class="text-xs text-muted truncate">{{ check.bank_name }} · {{ check.issuer_name }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-sm font-semibold">{{ formatCurrency(check.amount) }}</p>
              <p class="text-xs text-muted">Vence: {{ check.due_date }}</p>
            </div>
          </NuxtLink>
          <div v-if="pendingThirdPartyChecks.length > 5" class="text-center pt-3">
            <NuxtLink to="/erp/treasury/checks" class="text-xs text-primary hover:underline font-medium">
              +{{ pendingThirdPartyChecks.length - 5 }} más
            </NuxtLink>
          </div>
        </div>
      </UPageCard>

      <!-- A PAGAR -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-warning" />
              Cheques a pagar
              <UBadge
                v-if="pendingOwnChecks.length > 0"
                :label="`${pendingOwnChecks.length}`"
                color="warning"
                variant="soft"
                size="xs"
              />
            </h3>
            <UButton label="Ver todos" variant="ghost" size="xs" to="/erp/treasury/checks" />
          </div>
        </template>
        <div v-if="pendingOwnChecks.length === 0" class="text-center py-8 text-muted text-sm">
          No hay cheques propios pendientes
        </div>
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="check in pendingOwnChecks.slice(0, 5)"
            :key="check.id"
            :to="`/erp/treasury/checks/${check.id}/edit`"
            class="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-square-check" class="size-4 text-warning" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">N° {{ check.check_number }}</p>
                <p class="text-xs text-muted truncate">{{ check.bank_name }} · {{ check.issuer_name }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-sm font-semibold">{{ formatCurrency(check.amount) }}</p>
              <p class="text-xs text-muted">Vence: {{ check.due_date }}</p>
            </div>
          </NuxtLink>
          <div v-if="pendingOwnChecks.length > 5" class="text-center pt-3">
            <NuxtLink to="/erp/treasury/checks" class="text-xs text-primary hover:underline font-medium">
              +{{ pendingOwnChecks.length - 5 }} más
            </NuxtLink>
          </div>
        </div>
      </UPageCard>
    </div>
  </UPage>
</template>
