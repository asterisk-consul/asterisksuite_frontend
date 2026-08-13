<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
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

const partyId = route.params.partyId as string

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
    .filter((e) => resolveSide(e.type, account.value?.party_type ?? '') === 'debit')
    .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
)

const totalCredit = computed(() =>
  entries.value
    .filter((e) => resolveSide(e.type, account.value?.party_type ?? '') === 'credit')
    .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
)

const partyTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Proveedor',
    EMPLOYEE: 'Empleado',
    PARTNER: 'Socio'
  }
  return labels[account.value?.party_type ?? ''] ?? account.value?.party_type ?? ''
})

onMounted(async () => {
  try {
    await Promise.all([fetchStatement(partyId), fetchEntries(partyId)])
    if (statement.value?.account) {
      account.value = statement.value.account
    }
  } catch (e: any) {
    toast.add({ title: 'Error al cargar cuenta', color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/treasury/current-accounts')
  }
})

const goBack = () => {
  router.push('/erp/treasury/current-accounts')
}

const nuevoMovimientoItems = computed(() => {
  const partyType = account.value?.party_type

  if (partyType === 'CUSTOMER') {
    return [
      {
        label: 'Venta',
        icon: 'i-lucide-receipt',
        onSelect() {
          router.push(`/erp/sales/new?party_id=${partyId}`)
        }
      },
      {
        label: 'Cobro',
        icon: 'i-lucide-wallet',
        onSelect() {
          router.push(`/erp/treasury/payments/create?party_id=${partyId}`)
        }
      },
    ]
  }

  if (partyType === 'SUPPLIER') {
    return [
      {
        label: 'Compra',
        icon: 'i-lucide-shopping-cart',
        onSelect() {
          router.push(`/erp/purchases/purchases-documents/new?party_id=${partyId}`)
        }
      },
      {
        label: 'Pago',
        icon: 'i-lucide-wallet',
        onSelect() {
          router.push(`/erp/treasury/payments/create?party_id=${partyId}`)
        }
      },
    ]
  }

  return []
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      :title="account?.party?.name ?? 'Cuenta corriente'"
      :description="`${partyTypeLabel}`"
    >
      <template #links>
        <div class="flex gap-2">
          <CurrentAccountExport
            :entries="entries"
            :account="account"
            party-type-label="partyTypeLabel"
          />
          <UButton label="Volver" icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
          <UDropdownMenu :items="nuevoMovimientoItems">
            <UButton
              label="Nuevo movimiento"
              icon="i-heroicons-plus"
              color="primary"
              variant="solid"
            />
          </UDropdownMenu>
        </div>
      </template>
    </AppPageHeader>

    <!-- SUMMARY -->
    <CurrentAccountSummary
      :balance="balance"
      :total-debit="totalDebit"
      :total-credit="totalCredit"
      :party-type="account?.party_type"
      :party-type-label="partyTypeLabel"
      :account-count="entries.length"
    />

    <!-- CHARTS -->
    <CurrentAccountChart
      :entries="entries"
      :balance="balance"
      :party-type="account?.party_type"
    />

    <!-- ENTRIES TABLE -->
    <CurrentAccountEntryTable
      v-if="account"
      :entries="entries"
      :loading="loading"
      :party-type="account.party_type"
    />
  </UPage>
</template>
