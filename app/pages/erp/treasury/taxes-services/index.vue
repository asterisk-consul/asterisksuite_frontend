<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { getActivityInfo } from '~/modulos/erp/current-accounts/utils'

type View = 'pending' | 'regulatory' | 'utilities'
type Report = { months: string[]; parties: any[] }
const route = useRoute()
const router = useRouter()
const { allAccounts, loading: accountsLoading, fetchAll } = useCurrentAccounts()
const initialView = String(route.query.view ?? 'pending')
const activeView = ref<View>((['pending', 'regulatory', 'utilities'].includes(initialView) ? initialView : 'pending') as View)
const tabs = [
  { label: 'Saldos pendientes', value: 'pending', icon: 'i-lucide-wallet-cards' },
  { label: 'Entes impositivos', value: 'regulatory', icon: 'i-lucide-landmark' },
  { label: 'Servicios mensuales', value: 'utilities', icon: 'i-lucide-zap' }
]
const types = ['TAX_AUTHORITY', 'UTILITY', 'SERVICE_PROVIDER', 'FINANCIAL']
const typeLabels: Record<string, string> = { TAX_AUTHORITY: 'Ente impositivo', UTILITY: 'Servicio público', SERVICE_PROVIDER: 'Proveedor de servicios', FINANCIAL: 'Entidad financiera' }
const search = ref('')
const dateFrom = ref(`${new Date().getFullYear()}-01-01`)
const dateTo = ref(today())
const reportLoading = ref(false)
const reports = reactive<Record<'regulatory' | 'utilities', Report>>({ regulatory: { months: [], parties: [] }, utilities: { months: [], parties: [] } })

const accounts = computed(() => allAccounts.value.filter((account) => {
  const query = search.value.trim().toLowerCase()
  return types.includes(account.party_type) && (!query || (account.party?.name ?? '').toLowerCase().includes(query) || (account.party?.tax_id ?? '').toLowerCase().includes(query))
}))
const pendingAccounts = computed(() => accounts.value.filter(account => Number(account.balance) > 0))
const totalPending = computed(() => pendingAccounts.value.reduce((sum, account) => sum + Number(account.balance), 0))
const currentReport = computed(() => reports[activeView.value === 'regulatory' ? 'regulatory' : 'utilities'])
const monthlyTotals = computed(() => {
  const result: Record<string, number> = {}
  currentReport.value.parties.forEach(party => Object.entries(party.months).forEach(([month, amount]) => { result[month] = (result[month] ?? 0) + Number(amount) }))
  return result
})
const reportTotal = computed(() => currentReport.value.parties.reduce((sum, party) => sum + Number(party.total), 0))

async function loadReport() {
  if (activeView.value === 'pending') return
  reportLoading.value = true
  try {
    const endpoint = activeView.value === 'regulatory' ? 'regulatory-payments' : 'utility-payments'
    reports[activeView.value] = await $fetch(`/api/erp/treasury/${endpoint}`, { query: { date_from: dateFrom.value, date_to: dateTo.value } })
  } finally { reportLoading.value = false }
}
onMounted(async () => { await fetchAll({ party_type: types.join(',') }); await loadReport() })
watch(activeView, async view => { await router.replace({ query: view === 'pending' ? {} : { view } }); await loadReport() })
watch([dateFrom, dateTo], loadReport)

const fmt = (amount: number | string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(amount) || 0)
const fmtMonth = (month: string) => { const [year, number] = month.split('-'); return new Date(Number(year), Number(number) - 1).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) }
const openAccount = (id: string) => router.push(`/erp/treasury/current-accounts/${id}`)
const pay = (id: string) => router.push(`/erp/treasury/payments/create?type=PAYMENT&party_id=${id}`)
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Impuestos y servicios" description="Saldos, pagos y evolución mensual en un solo lugar" />
    <UTabs v-model="activeView" :items="tabs" :content="false" variant="link" class="w-full" />

    <template v-if="activeView === 'pending'">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UPageCard variant="subtle"><p class="text-xs text-muted">Total pendiente</p><p class="mt-1 text-xl font-bold text-error">{{ fmt(totalPending) }}</p></UPageCard>
        <UPageCard variant="subtle"><p class="text-xs text-muted">Entidades con saldo</p><p class="mt-1 text-xl font-bold">{{ pendingAccounts.length }}</p></UPageCard>
      </div>
      <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar por entidad o CUIT..." class="w-full max-w-xl" />
      <div class="overflow-hidden rounded-lg border border-default">
        <div v-if="accountsLoading" class="p-8"><UProgress /></div>
        <div v-else-if="accounts.length === 0" class="p-10 text-center text-sm text-muted">No hay cuentas. Se crearán al confirmar el primer documento de compra de una entidad.</div>
        <div v-else class="divide-y divide-default">
          <div v-for="account in accounts" :key="account.id" class="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/30">
            <button class="min-w-0 flex-1 text-left" @click="openAccount(account.party_id)"><p class="truncate font-medium">{{ account.party?.name ?? 'Sin nombre' }}</p><div class="mt-1 flex flex-wrap gap-2 text-xs text-muted"><UBadge :label="typeLabels[account.party_type] ?? account.party_type" variant="soft" color="neutral" size="xs" /><span>CUIT: {{ account.party?.tax_id ?? '—' }}</span><span>{{ getActivityInfo(account.last_entry_date, account.last_entry).lastMovementLabel }}</span></div></button>
            <div class="text-right"><p class="text-xs text-muted">Saldo pendiente</p><p class="font-bold" :class="Number(account.balance) > 0 ? 'text-error' : 'text-success'">{{ fmt(account.balance) }}</p></div>
            <UButton label="Ver cuenta" variant="outline" size="sm" @click="openAccount(account.party_id)" />
            <UButton label="Registrar pago" icon="i-lucide-hand-coins" size="sm" :disabled="Number(account.balance) <= 0" @click="pay(account.party_id)" />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-wrap items-end gap-3"><UFormField label="Desde"><UInput v-model="dateFrom" type="date" /></UFormField><UFormField label="Hasta"><UInput v-model="dateTo" type="date" /></UFormField></div>
      <div v-if="reportLoading" class="flex justify-center py-10"><ULoader /></div>
      <div v-else-if="currentReport.parties.length === 0" class="py-10 text-center text-sm text-muted">No hay pagos en el período seleccionado.</div>
      <template v-else>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2"><UPageCard variant="subtle"><p class="text-xs text-muted">Total pagado</p><p class="mt-1 text-xl font-semibold text-primary">{{ fmt(reportTotal) }}</p></UPageCard><UPageCard variant="subtle"><p class="text-xs text-muted">Entidades</p><p class="mt-1 text-xl font-semibold">{{ currentReport.parties.length }}</p></UPageCard></div>
        <UPageCard variant="subtle"><template #header><h3 class="text-sm font-semibold">Detalle por entidad y mes</h3></template>
          <div class="max-h-[60vh] overflow-auto"><table class="w-full text-sm">
            <thead class="sticky top-0 z-10 bg-default"><tr class="border-b border-default"><th class="px-3 py-2 text-left text-xs text-muted">Entidad</th><th v-for="month in currentReport.months" :key="month" class="px-3 py-2 text-right text-xs text-muted">{{ fmtMonth(month) }}</th><th class="px-3 py-2 text-right text-xs text-muted">Total</th><th /></tr></thead>
            <tbody><tr v-for="party in currentReport.parties" :key="party.party_id" class="border-b border-default hover:bg-muted/30"><td class="px-3 py-2"><p class="font-medium">{{ party.party_name }}</p><UBadge v-if="party.party_type" :label="typeLabels[party.party_type] ?? party.party_type" variant="soft" color="neutral" size="xs" /></td><td v-for="month in currentReport.months" :key="month" class="px-3 py-2 text-right font-mono text-xs">{{ party.months[month] ? fmt(party.months[month]) : '—' }}</td><td class="px-3 py-2 text-right font-semibold">{{ fmt(party.total) }}</td><td class="whitespace-nowrap px-3 py-2"><UButton label="Cuenta" variant="ghost" size="xs" @click="openAccount(party.party_id)" /><UButton label="Pagar" variant="ghost" size="xs" @click="pay(party.party_id)" /></td></tr></tbody>
            <tfoot><tr class="border-t-2 border-default font-semibold"><td class="px-3 py-2 text-right">Total mensual:</td><td v-for="month in currentReport.months" :key="month" class="px-3 py-2 text-right font-mono text-xs">{{ fmt(monthlyTotals[month] ?? 0) }}</td><td class="px-3 py-2 text-right text-primary">{{ fmt(reportTotal) }}</td><td /></tr></tfoot>
          </table></div>
        </UPageCard>
      </template>
    </template>
  </UPage>
</template>
