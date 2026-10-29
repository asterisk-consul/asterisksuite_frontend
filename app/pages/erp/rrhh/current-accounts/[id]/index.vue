<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import type { AccountEntryType, CurrentAccount, CurrentAccountEntry } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { resolveEntrySide } from '~/modulos/erp/current-accounts/utils'
import { HR_VALE_STATUS_LABELS } from '~/modulos/erp/hr/types/hr.types'

import CurrentAccountSummary from '~/components/current-account/CurrentAccountSummary.vue'
import CurrentAccountChart from '~/components/current-account/CurrentAccountChart.vue'
import CurrentAccountEntryTable from '~/components/current-account/CurrentAccountEntryTable.vue'
import CurrentAccountExport from '~/components/current-account/CurrentAccountExport.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const hrStore = useHrStore()
const { currentAccount, currentEntries, loading } = storeToRefs(hrStore)

const accountId = route.params.id as string
const currencyCode = computed(() => currentAccount.value?.currency_code || 'ARS')

const account = computed(() => currentAccount.value as CurrentAccount | null)
const activeAccountTab = usePersistedViewTab('hr-current-account-record', 'history')
const accountTabs = [
  { label: 'Historial', value: 'history', slot: 'history', icon: 'i-lucide-list' },
  { label: 'Gráficos', value: 'analysis', slot: 'analysis', icon: 'i-lucide-chart-no-axes-combined' }
]

useBreadcrumbEntityLabel(
  `/erp/rrhh/current-accounts/${accountId}`,
  computed(() => account.value?.party?.name)
)

const entries = computed(() => {
  const list: CurrentAccountEntry[] = currentEntries.value.map(entry => ({
    ...entry,
    current_account_id: entry.hr_account_id,
    type: entry.type as AccountEntryType,
    // El saldo de RRHH se lleva en la moneda propia de la cuenta.
    converted_amount: null,
    description: [
      entry.reference_type === 'hr_vale'
        ? entry.description?.replace(/^Vale #\d+\s*[-·]\s*/, '')
        : entry.description,
      entry.vale_status ? `Estado: ${HR_VALE_STATUS_LABELS[entry.vale_status]}` : null,
      entry.payment_origin ? `Pago desde ${entry.payment_origin}` : null,
    ].filter(Boolean).join(' · ') || entry.description,
  }))
  return list.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
    || new Date(b.created_at ?? b.date).getTime() - new Date(a.created_at ?? a.date).getTime()
    || b.id.localeCompare(a.id)
  )
})

const balance = computed(() => Number(currentAccount.value?.balance ?? 0))
const partnerPosition = ref<{ available: number; remuneration_pending: number; contributions: number; withdrawals: number; balance: number } | null>(null)
const formatPosition = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode.value }).format(amount)
watch(currentAccount, async (current, _previous, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  partnerPosition.value = null
  if (current?.party_type !== 'PARTNER') return
  try {
    const result = await $fetch<NonNullable<typeof partnerPosition.value>>(`/api/backend/hr/partners/${current.party_id}/funds`, { query: { currency_code: current.currency_code } })
    if (!cancelled) partnerPosition.value = result
  } catch {
    if (!cancelled) toast.add({ title: 'No se pudo consultar el disponible de aportes', color: 'warning' })
  }
}, { immediate: true })

const totalDebit = computed(() =>
  entries.value
    .filter(e => resolveEntrySide(e, account.value?.party_type ?? '') === 'debit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const totalCredit = computed(() =>
  entries.value
    .filter(e => resolveEntrySide(e, account.value?.party_type ?? '') === 'credit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const partyTypeLabel = computed(() => {
  if (!account.value) return ''
  return account.value.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio'
})

onMounted(async () => {
  try {
    await hrStore.fetchAccountEntries(accountId)
  } catch (e: any) {
    toast.add({ title: 'Error al cargar cuenta', color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/rrhh/current-accounts')
  }
})

const goBack = () => {
  router.push('/erp/rrhh/current-accounts')
}
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
    <div class="flex min-w-0 flex-col gap-5">
    <AppPageHeader
      :title="account?.party?.name ?? 'Cuenta corriente'"
      :description="`Estado de cuenta · ${partyTypeLabel}`"
    >
      <template #links>
        <CurrentAccountExport
          :entries="entries"
          :account="account"
          :currency-code="currencyCode"
          :party-type-label="partyTypeLabel"
        />
        <UButton label="Volver" icon="i-lucide-arrow-left" variant="outline" @click="goBack" />
      </template>
    </AppPageHeader>

    <!-- SUMMARY -->
    <CurrentAccountSummary
      :balance="balance"
      :total-debit="totalDebit"
      :total-credit="totalCredit"
      :currency-code="currencyCode"
      :party-type="account?.party_type"
      :party-type-label="partyTypeLabel"
    />

    <UPageCard v-if="partnerPosition" variant="subtle">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><p class="text-sm text-muted">Aportes disponibles para retirar</p><p class="text-xl font-semibold" :class="partnerPosition.available > 0 ? 'text-success' : 'text-muted'">{{ formatPosition(partnerPosition.available) }}</p></div>
          <div><p class="text-sm text-muted">Remuneraciones pendientes de pago</p><p class="text-xl font-semibold" :class="partnerPosition.remuneration_pending > 0 ? 'text-warning' : 'text-muted'">{{ formatPosition(partnerPosition.remuneration_pending) }}</p></div>
        </div>
        <p class="text-sm text-muted">Los retiros de aportes están limitados al disponible en esta moneda. Las remuneraciones se pagan desde Tesorería.</p>
        <UAlert
          v-if="partnerPosition.balance < 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="Los retiros superan los aportes registrados"
          :description="partnerPosition.contributions === 0
            ? `No hay aportes confirmados en ${currencyCode}. Los retiros registrados suman ${formatPosition(partnerPosition.withdrawals)}. Revisá si falta registrar un aporte inicial o si corresponde corregir el concepto de los movimientos históricos.`
            : `La diferencia es ${formatPosition(Math.abs(partnerPosition.balance))}. Revisá los aportes y retiros históricos; los nuevos retiros están bloqueados hasta contar con disponible.`"
        />
      </div>
    </UPageCard>

    <UTabs
      v-model="activeAccountTab"
      :items="accountTabs"
      variant="link"
      :ui="{ trigger: 'cursor-pointer' }"
      class="w-full"
    >
      <template #history>
        <div class="space-y-4 pt-4">
          <div>
            <p class="text-base font-semibold">Historial de la cuenta</p>
            <p class="text-sm text-muted">Consultá, filtrá y ordená los vales y sus movimientos</p>
          </div>
          <CurrentAccountEntryTable
            v-if="account"
            :entries="entries"
            :loading="loading"
            :initial-sorting="[{ id: 'date', desc: true }]"
            :party-type="account.party_type"
            :currency-code="currencyCode"
          />
        </div>
      </template>

      <template #analysis>
        <div class="space-y-4 pt-4">
          <div>
            <p class="text-base font-semibold">Análisis de la cuenta</p>
            <p class="text-sm text-muted">Evolución y composición de los movimientos</p>
          </div>
          <CurrentAccountChart
            :entries="entries"
            :balance="balance"
            :currency-code="currencyCode"
            :party-type="account?.party_type"
            :use-ledger-balance="true"
          />
        </div>
      </template>
    </UTabs>
    </div>
  </UPage>
</template>
