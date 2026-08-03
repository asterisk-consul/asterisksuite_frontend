<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { resolveSide } from '~/modulos/erp/current-accounts/utils'

import CurrentAccountSummary from '~/components/current-account/CurrentAccountSummary.vue'
import CurrentAccountChart from '~/components/current-account/CurrentAccountChart.vue'
import CurrentAccountEntryTable from '~/components/current-account/CurrentAccountEntryTable.vue'
import CurrentAccountExport from '~/components/current-account/CurrentAccountExport.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { statement, entries: storeEntries, loading, fetchStatement, fetchEntries } = useCurrentAccounts()

const partyId = route.params.id as string
const currencyCode = (route.query.currency as string) || 'ARS'

const account = ref<CurrentAccount | null>(null)

const entries = computed(() => {
  const fromStatement = statement.value?.entries ?? []
  const fromStore = storeEntries.value ?? []
  const list = fromStatement.length > 0 ? fromStatement : fromStore
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const balance = computed(() => Number(statement.value?.balance ?? 0))

const totalDebit = computed(() =>
  entries.value
    .filter(e => resolveSide(e.type, account.value?.party_type ?? '') === 'debit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const totalCredit = computed(() =>
  entries.value
    .filter(e => resolveSide(e.type, account.value?.party_type ?? '') === 'credit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const partyTypeLabel = computed(() => {
  if (!account.value) return ''
  return account.value.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio'
})

onMounted(async () => {
  try {
    await Promise.all([fetchStatement(partyId, currencyCode), fetchEntries(partyId, currencyCode)])
    if (statement.value?.account) {
      account.value = statement.value.account
    }
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
