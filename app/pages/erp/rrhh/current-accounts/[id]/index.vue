<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import type { AccountEntryType, CurrentAccount, CurrentAccountEntry } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { resolveEntrySide } from '~/modulos/erp/current-accounts/utils'

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

useBreadcrumbEntityLabel(
  `/erp/rrhh/current-accounts/${accountId}`,
  computed(() => account.value?.party?.name)
)

const entries = computed(() => {
  const list: CurrentAccountEntry[] = currentEntries.value.map(entry => ({
    ...entry,
    current_account_id: entry.hr_account_id,
    type: entry.type as AccountEntryType,
  }))
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const balance = computed(() => Number(currentAccount.value?.balance ?? 0))

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
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      :title="`Cuenta Corriente — ${account?.party?.name ?? '...'}`"
      :description="`${partyTypeLabel} · Saldo: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(balance)}`"
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

    <!-- CHARTS -->
    <CurrentAccountChart
      :entries="entries"
      :balance="balance"
      :currency-code="currencyCode"
      :party-type="account?.party_type"
    />

    <!-- ENTRIES TABLE -->
    <CurrentAccountEntryTable
      v-if="account"
      :entries="entries"
      :loading="loading"
      :party-type="account.party_type"
      :currency-code="currencyCode"
    />
  </UPage>
</template>
