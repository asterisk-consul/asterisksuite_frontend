<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useChecksService } from '~/modulos/erp/checks/service/checks.service'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import { sumCheckTotals } from '~/modulos/erp/checks/utils/check-totals'
import { CHECK_ALERT_DAYS_STORAGE_KEY, DEFAULT_CHECK_ALERT_DAYS, filterUpcomingChecks, normalizeCheckAlertDays } from '~/modulos/erp/checks/utils/check-upcoming'
import { useTreasuryReports } from '~/modulos/erp/treasury-reports/composables/useTreasuryReports'

const auth = useAuthStore()
const { hasPermission } = useRoles()
const checksService = useChecksService()
const { pending, pendingLoading, pendingError, fetchPending } = useTreasuryReports()

const isOwner = computed(() => auth.selectedCompany?.role === 'OWNER')
const canReadPayments = computed(() => isOwner.value || hasPermission('payments.read'))
const canReadTransfers = computed(() => isOwner.value || hasPermission('cash_box_transfers.read'))
const canReadPending = computed(() => canReadPayments.value || canReadTransfers.value)
const canReadChecks = computed(() => isOwner.value || hasPermission('checks.read'))
const checksData = ref<Check[]>([])
const checksLoading = ref(false)
const checksError = ref(false)
const checkAlertDays = ref(DEFAULT_CHECK_ALERT_DAYS)
const refreshLoading = computed(() => pendingLoading.value || checksLoading.value)

const configs = [
  { id: 'advances' as const, title: 'Anticipos y créditos por aplicar', to: '/erp/treasury/payments?pending=advances', icon: 'i-lucide-wallet-cards' },
  { id: 'drafts' as const, title: 'Pagos y cobros en borrador', to: '/erp/treasury/payments?pending=drafts', icon: 'i-lucide-file-pen-line' },
  { id: 'obligations' as const, title: 'Obligaciones próximas o vencidas', to: '/erp/treasury/taxes-services?view=pending&dashboard_due=1', icon: 'i-lucide-calendar-clock' },
  { id: 'transfers' as const, title: 'Transferencias pendientes', to: '/erp/treasury/cash-box-transfers?status=pending', icon: 'i-lucide-arrow-left-right' },
]

const pendingGroups = computed(() => configs.flatMap(config => {
  const allowed = config.id === 'transfers' ? canReadTransfers.value : canReadPayments.value
  const group = allowed ? pending.value?.[config.id] : null
  return group && group.count > 0 ? [{ ...config, ...group }] : []
}))

const checkGroups = computed(() => {
  if (!canReadChecks.value) return []
  const thirdParty = filterUpcomingChecks(checksData.value, checkAlertDays.value, 'third-party')
  const own = filterUpcomingChecks(checksData.value, checkAlertDays.value, 'own')
  return [
    {
      id: 'checks-in' as const,
      title: 'Cheques a cobrar',
      icon: 'i-lucide-arrow-down-left',
      count: thirdParty.length,
      totals: sumCheckTotals(thirdParty),
      to: { path: '/erp/treasury/checks', query: { alert: 'upcoming', days: String(checkAlertDays.value), ownership: 'third-party' } },
    },
    {
      id: 'checks-out' as const,
      title: 'Cheques a pagar',
      icon: 'i-lucide-arrow-up-right',
      count: own.length,
      totals: sumCheckTotals(own),
      to: { path: '/erp/treasury/checks', query: { alert: 'upcoming', days: String(checkAlertDays.value), ownership: 'own' } },
    },
  ]
})

const groups = computed(() => [
  ...checkGroups.value,
  ...pendingGroups.value,
])

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      currencyDisplay: 'code',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(amount)}`
  }
}

const totalsLabel = (totals: Array<{ amount: number; currency_code: string }>) =>
  totals.map(total => formatCurrency(total.amount, total.currency_code)).join(' · ')

const refresh = async () => {
  const companyId = auth.selectedCompany?.id
  if (!companyId) return

  checkAlertDays.value = normalizeCheckAlertDays(localStorage.getItem(CHECK_ALERT_DAYS_STORAGE_KEY))
  const requests: Promise<unknown>[] = []

  if (canReadPending.value) requests.push(fetchPending())
  if (canReadChecks.value) {
    checksLoading.value = true
    checksError.value = false
    requests.push(checksService.findUpcoming(checkAlertDays.value)
      .then((data) => {
        if (auth.selectedCompany?.id === companyId) checksData.value = data
      })
      .catch(() => {
        if (auth.selectedCompany?.id === companyId) checksError.value = true
      })
      .finally(() => {
        if (auth.selectedCompany?.id === companyId) checksLoading.value = false
      }))
  }

  await Promise.allSettled(requests)
}

onMounted(() => { void refresh() })
</script>

<template>
  <UPageCard variant="subtle" class="overflow-hidden @container">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="grid size-9 place-items-center rounded-xl bg-warning/10 text-warning">
            <UIcon name="i-lucide-hourglass" class="size-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold">Pendientes de tesorería</h3>
            <p class="text-xs text-muted">Cheques en los próximos {{ checkAlertDays }} días · otros pendientes</p>
          </div>
        </div>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs" :loading="refreshLoading" aria-label="Actualizar pendientes de tesorería" @click="refresh" />
      </div>
    </template>

    <UAlert
      v-if="!canReadPending && !canReadChecks"
      color="neutral"
      variant="subtle"
      icon="i-lucide-lock-keyhole"
      title="Sin permiso para consultar pendientes"
      description="Necesitás permiso para ver cheques, pagos o transferencias de caja."
    />

    <div v-else-if="refreshLoading && !pending && !checksData.length" class="grid gap-2 sm:grid-cols-2">
      <USkeleton v-for="index in 6" :key="index" class="h-14 rounded-lg" />
    </div>

    <div v-else class="space-y-2">
      <UAlert
        v-if="(canReadPending && pendingError) || (canReadChecks && checksError)"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Algunos pendientes no se pudieron cargar"
        description="Actualizá para volver a consultar."
      />

      <div v-if="groups.length" class="pending-groups">
        <NuxtLink
          v-for="group in groups"
          :key="group.id"
          :to="group.to"
          class="group flex min-w-0 items-center gap-2.5 rounded-lg border border-default bg-muted/20 px-2.5 py-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <UIcon :name="group.icon" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="truncate text-[11px] font-medium text-muted">{{ group.title }}</p>
              <UBadge color="neutral" size="xs" variant="subtle">{{ group.count }}</UBadge>
            </div>
            <p v-if="group.totals.length" class="mt-0.5 truncate text-xs font-semibold tabular-nums">{{ totalsLabel(group.totals) }}</p>
            <p v-else-if="group.id === 'checks-in' || group.id === 'checks-out'" class="mt-0.5 truncate text-[11px] text-muted">Sin cheques en los próximos {{ checkAlertDays }} días</p>
            <p v-if="'estimated_count' in group && group.estimated_count" class="text-[10px] text-muted">{{ group.estimated_count }} importe(s) estimado(s)</p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </NuxtLink>
      </div>

      <p v-else class="rounded-lg border border-dashed border-default px-3 py-4 text-center text-xs text-muted">
        No hay cheques próximos ni otros pendientes para mostrar.
      </p>
    </div>

    <div class="mt-2 flex justify-end border-t border-default pt-2">
      <UButton label="Abrir tablero de tesorería" icon="i-lucide-arrow-up-right" to="/erp/treasury/dashboard" color="neutral" variant="ghost" size="xs" />
    </div>
  </UPageCard>
</template>

<style scoped>
.pending-groups {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .pending-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (min-width: 900px) {
  .pending-groups {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
