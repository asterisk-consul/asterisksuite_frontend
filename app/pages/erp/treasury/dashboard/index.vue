<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import type { CashBox } from '~/modulos/erp/cash-boxes/types/cash-boxes.types'
import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useIntercompanyTreasuryService } from '~/modulos/erp/treasury/intercompany-treasury.service'
import type { IntercompanySummary } from '~/modulos/erp/treasury/intercompany-treasury.service'
import CheckAlertCards from '~/components/erp/CheckAlertCards.vue'
import CheckAlertDaysSettings from '~/components/erp/CheckAlertDaysSettings.vue'
import TreasuryPendingPanel from '~/components/erp/TreasuryPendingPanel.vue'
import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'
import { sumCheckTotals } from '~/modulos/erp/checks/utils/check-totals'
import type { CheckAlertCard, CheckAlertKind } from '~/modulos/erp/checks/types/check-alerts.types'
import { getArgentinaDateKey, getCheckDateKey } from '~/modulos/erp/checks/utils/check-dates'
import { CHECK_ALERT_DAYS_STORAGE_KEY, DEFAULT_CHECK_ALERT_DAYS, filterUpcomingChecks, normalizeCheckAlertDays } from '~/modulos/erp/checks/utils/check-upcoming'
import type { CheckOwnership } from '~/modulos/erp/checks/utils/check-upcoming'

const { bankAccounts, init: fetchBankAccounts } = useBankAccounts()
const { cashBoxes, init: fetchCashBoxes } = useCashBoxes()
const { checks, init: fetchChecks } = useChecks()
const { pending, pendingLoading, pendingError, fetchPending } = useTreasuryReports()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const router = useRouter()
const { visible: showIntercompany } = useIntercompanyVisibility()
const intercompanySummaries = ref<IntercompanySummary[]>([])
const intercompanyBalances = computed(() => intercompanySummaries.value.filter(row => Math.abs(row.balance) >= 0.01).slice(0, 3))
watch(showIntercompany, async visible => {
  if (!visible) { intercompanySummaries.value = []; return }
  const companyId = useAuthStore().selectedCompany?.id
  try {
    const result = await useIntercompanyTreasuryService().overview()
    if (showIntercompany.value && companyId === useAuthStore().selectedCompany?.id) intercompanySummaries.value = result.summaries
  }
  catch { intercompanySummaries.value = [] }
}, { immediate: true })

const showBankAccounts = computed(() => isOwnerOrAdmin.value || hasPermission('bank_accounts.read'))
const showCashBoxes = computed(() => isOwnerOrAdmin.value || hasPermission('cash_boxes.read'))
const showPayments = computed(() => isOwnerOrAdmin.value || hasPermission('payments.read'))
const showChecks = computed(() => isOwnerOrAdmin.value || hasPermission('checks.read'))
const canReadPending = computed(() => useAuthStore().selectedCompany?.role === 'OWNER'
  || hasPermission('payments.read') || hasPermission('cash_box_transfers.read'))
const canUpdatePayments = computed(() => useAuthStore().selectedCompany?.role === 'OWNER' || hasPermission('payments.update'))
watch(canReadPending, allowed => { if (allowed) void fetchPending() }, { immediate: true })
const checkAlertDays = ref(DEFAULT_CHECK_ALERT_DAYS)
const checkAlertDaysInput = ref(DEFAULT_CHECK_ALERT_DAYS)
const checkSettingsOpen = ref(false)
const savingCheckSettings = ref(false)
const effectiveCheckAlertDays = computed(() => checkSettingsOpen.value
  ? normalizeCheckAlertDays(checkAlertDaysInput.value)
  : checkAlertDays.value)

const saveCheckAlertDays = async () => {
  if (savingCheckSettings.value) return
  const days = normalizeCheckAlertDays(checkAlertDaysInput.value)
  checkAlertDays.value = days
  checkAlertDaysInput.value = days
  localStorage.setItem(CHECK_ALERT_DAYS_STORAGE_KEY, String(days))
  savingCheckSettings.value = true
  try {
    if (showChecks.value) await fetchChecks().catch(() => {})
    checkSettingsOpen.value = false
  } finally {
    savingCheckSettings.value = false
  }
}

watch(checkSettingsOpen, (open) => {
  if (open) checkAlertDaysInput.value = checkAlertDays.value
})

const cancelCheckSettings = () => {
  checkAlertDaysInput.value = checkAlertDays.value
  checkSettingsOpen.value = false
}

onMounted(async () => {
  const savedDays = normalizeCheckAlertDays(localStorage.getItem(CHECK_ALERT_DAYS_STORAGE_KEY))
  checkAlertDays.value = savedDays
  checkAlertDaysInput.value = savedDays
  await Promise.allSettled([
    fetchBankAccounts().catch(() => {}),
    fetchCashBoxes().catch(() => {})
  ])
})

watch(showChecks, (allowed) => {
  if (allowed) fetchChecks().catch(() => {})
}, { immediate: true })

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(num)
}

const activeCashBoxBalances = (box: CashBox) => (box.balances ?? []).filter(balance => !balance.deleted_at)

const pendingOwnChecks = computed(() => filterUpcomingChecks(checks.value, effectiveCheckAlertDays.value, 'own'))

const pendingThirdPartyChecks = computed(() => filterUpcomingChecks(checks.value, effectiveCheckAlertDays.value, 'third-party'))

const thirdPartyChecksToResolve = computed(() => {
  const today = getArgentinaDateKey()
  return checks.value.filter(c =>
    !c.is_own &&
    ['PENDING', 'CONFIRMED'].includes(c.status) &&
    getCheckDateKey(c.due_date) <= today
  )
})

const ownChecksToVerify = computed(() => {
  const today = getArgentinaDateKey()
  return checks.value.filter(c =>
    c.is_own &&
    c.status === 'CONFIRMED' &&
    getCheckDateKey(c.due_date) <= today
  )
})

const checkAlertCards = computed<CheckAlertCard[]>(() => [
  ...(thirdPartyChecksToResolve.value.length > 0 ? [{
    id: 'third-party' as const,
    title: 'Cheques de terceros por resolver',
    count: thirdPartyChecksToResolve.value.length,
    totals: sumCheckTotals(thirdPartyChecksToResolve.value),
    description: 'Vencen hoy o ya vencieron. Siguen en cartera hasta depositarlos, cobrarlos o aplicarlos a un pago.',
    actionLabel: 'Revisar cheques',
    icon: 'i-lucide-calendar-clock',
    tone: 'warning' as const
  }] : []),
  ...(ownChecksToVerify.value.length > 0 ? [{
    id: 'own' as const,
    title: 'Débitos de cheques propios por registrar',
    count: ownChecksToVerify.value.length,
    totals: sumCheckTotals(ownChecksToVerify.value),
    description: 'Vencen hoy o ya vencieron. Revisá el movimiento real antes de registrar el débito o pago desde caja.',
    actionLabel: 'Revisar débitos',
    icon: 'i-lucide-landmark',
    tone: 'primary' as const
  }] : [])
])

function openCheckAlert(filter: CheckAlertKind) {
  void router.push({
    path: '/erp/treasury/checks',
    query: {
      alert: filter,
      ...(filter === 'upcoming' ? { days: String(effectiveCheckAlertDays.value) } : {})
    }
  })
}

const upcomingChecksLink = (ownership: CheckOwnership) => ({
  path: '/erp/treasury/checks',
  query: { alert: 'upcoming', days: String(effectiveCheckAlertDays.value), ownership },
})

const totalOwnCheckAmount = computed(() => sumCheckTotals(pendingOwnChecks.value)
  .map(total => formatCurrency(total.amount, total.currency_code)).join(' · ') || formatCurrency(0))

const totalThirdPartyCheckAmount = computed(() =>
  sumCheckTotals(pendingThirdPartyChecks.value)
    .map(total => formatCurrency(total.amount, total.currency_code)).join(' · ') || formatCurrency(0)
)

const statCards = computed(() => {
  const cards: any[] = []

  if (showChecks.value) {
    cards.push({
      label: 'A cobrar',
      value: `${pendingThirdPartyChecks.value.length} cheques`,
      sub: totalThirdPartyCheckAmount.value,
      icon: 'i-lucide-arrow-down-left',
      color: 'info' as const,
      to: upcomingChecksLink('third-party')
    })
    cards.push({
      label: 'A pagar',
      value: `${pendingOwnChecks.value.length} cheques`,
      sub: totalOwnCheckAmount.value,
      icon: 'i-lucide-arrow-up-right',
      color: 'warning' as const,
      to: upcomingChecksLink('own')
    })
  }

  return cards
})

const quickActions = computed(() => {
  const actions: any[] = []
  if (showPayments.value) {
    actions.push({ label: 'Nuevo pago', icon: 'i-lucide-send', to: '/erp/treasury/payments/create', color: 'primary' as const })
  }
  if (showChecks.value) {
    actions.push({ label: 'Nuevo cheque', icon: 'i-lucide-square-plus', to: '/erp/treasury/checks/create', color: 'warning' as const })
  }
  if (showCashBoxes.value) {
    actions.push({ label: 'Transferencia caja', icon: 'i-lucide-arrow-left-right', to: '/erp/treasury/cash-box-transfers', color: 'info' as const })
  }
  actions.push({ label: 'Cuentas corrientes', icon: 'i-lucide-file-text', to: '/erp/treasury/current-accounts', color: 'warning' as const })
  if (showBankAccounts.value) {
    actions.push({ label: 'Cuentas bancarias', icon: 'i-lucide-landmark', to: '/erp/treasury/bank-accounts', color: 'primary' as const })
  }
  if (showCashBoxes.value) {
    actions.push({ label: 'Cajas', icon: 'i-lucide-wallet', to: '/erp/treasury/cash-boxes', color: 'success' as const })
  }
  if (showChecks.value) {
    actions.push({ label: 'Cheques', icon: 'i-lucide-square-check', to: '/erp/treasury/checks', color: 'info' as const })
  }
  if (showPayments.value) {
    actions.push({ label: 'Pagos y cobros', icon: 'i-lucide-hand-coins', to: '/erp/treasury/payments', color: 'secondary' as const })
  }
  actions.push({ label: 'Cuentas contables', icon: 'i-lucide-calculator', to: '/erp/contabilidad/accounts', color: 'primary' as const })
  actions.push({ label: 'Conceptos bancarios', icon: 'i-lucide-receipt', to: '/erp/treasury/bank-concepts', color: 'info' as const })
  actions.push({ label: 'Reportes', icon: 'i-lucide-bar-chart-3', to: '/erp/treasury/reports', color: 'success' as const })
  return actions
})
</script>

<template>
  <UPage>
    <div class="flex flex-col gap-6 px-4">
    <AppPageHeader title="Dashboard Tesorería" description="Resumen general de la situación financiera" />
    <NuxtLink v-if="showIntercompany && intercompanyBalances.length" to="/erp/treasury/intercompany" class="block">
      <UPageCard variant="subtle" class="border-warning/30 hover:border-warning/60 transition-colors">
        <div class="flex items-start gap-3"><UIcon name="i-lucide-building-2" class="mt-1 size-5 text-warning" />
          <div class="flex flex-col gap-1"><h2 class="font-semibold">Entre empresas</h2>
            <p v-for="row in intercompanyBalances" :key="`${row.company_id}:${row.currency_code}`" class="text-sm">
              {{ row.balance > 0 ? 'Por rendir a' : 'A favor de esta empresa frente a' }} {{ row.company_name }}:
              <strong>{{ formatCurrency(Math.abs(row.balance), row.currency_code) }}</strong>
            </p>
            <span class="text-xs text-primary">Ver movimientos y transferencias →</span>
          </div>
        </div>
      </UPageCard>
    </NuxtLink>
    <div v-if="showChecks" class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted">Cheques a cobrar y pagar · próximos <strong class="font-medium text-highlighted">{{ effectiveCheckAlertDays }} días</strong></p>
        <CheckAlertDaysSettings
          v-model="checkAlertDaysInput"
          v-model:open="checkSettingsOpen"
          :loading="savingCheckSettings"
          @save="saveCheckAlertDays"
          @cancel="cancelCheckSettings"
        />
    </div>

    <!-- STAT CARDS -->
    <div v-if="statCards.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

    <CheckAlertCards
      v-if="showChecks && checkAlertCards.length"
      :alerts="checkAlertCards"
      variant="attention"
      @select="openCheckAlert"
    />

    <!-- QUICK ACTIONS -->
    <div class="flex flex-wrap items-center gap-2">
      <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to">
        <UButton :label="action.label" :icon="action.icon" :color="action.color" variant="outline" size="sm" />
      </NuxtLink>
    </div>

    <!-- BANK ACCOUNTS + CASH BOXES -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      <!-- BANK ACCOUNTS -->
      <UPageCard v-if="showBankAccounts" variant="subtle">
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
            <span class="text-sm font-semibold tabular-nums shrink-0 ml-3" :class="Number(account.balance) < 0 ? 'text-error' : 'text-highlighted'">
              {{ formatCurrency(account.balance, account.currency_code) }}
            </span>
          </NuxtLink>
        </div>
      </UPageCard>

      <!-- CASH BOXES -->
      <UPageCard v-if="showCashBoxes" variant="subtle">
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
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span class="text-xs text-muted">{{ box.type === 'MAIN' ? 'Principal' : box.type === 'FIXED' ? 'Fondo fijo' : 'Caja registradora' }}</span>
                  <UBadge
                    :label="box.status === 'OPEN' ? 'Abierta' : 'Cerrada'"
                    :color="box.status === 'OPEN' ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                  />
                </div>
              </div>
            </div>
            <div class="ml-3 flex shrink-0 flex-col items-end gap-1 text-right">
              <span
                v-for="balance in activeCashBoxBalances(box)"
                :key="balance.id"
                class="text-sm font-semibold tabular-nums"
                :class="Number(balance.balance) < 0 ? 'text-error' : 'text-highlighted'"
              >{{ formatCurrency(balance.balance, balance.currency_code) }}</span>
              <span v-if="!activeCashBoxBalances(box).length" class="text-xs text-muted">Sin saldo registrado</span>
            </div>
          </NuxtLink>
        </div>
      </UPageCard>
    </div>

    <TreasuryPendingPanel
      v-if="canReadPending"
      :data="pending"
      :loading="pendingLoading"
      :error="pendingError"
      :can-update-payments="canUpdatePayments"
      @refresh="fetchPending"
    />
    </div>
  </UPage>
</template>
