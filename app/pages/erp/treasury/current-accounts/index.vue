<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'

const { activeAccounts, loading, fetchActive } = useCurrentAccounts()

const router = useRouter()

const searchQuery = ref('')
const filterCurrency = ref<{ label: string; value: string } | null>(null)

onMounted(() => fetchActive())

const availableCurrencies = computed(() => {
  const codes = new Set(activeAccounts.value.map((a) => a.currency_code))
  return Array.from(codes)
    .sort()
    .map((c) => ({ label: c, value: c }))
})

const activeCurrency = computed(() => filterCurrency.value?.value ?? '')

const filteredAccounts = computed(() => {
  let list = activeAccounts.value
  if (activeCurrency.value) {
    list = list.filter((a) => a.currency_code === activeCurrency.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((a) => {
      const name = (a.party?.name ?? '').toLowerCase()
      const id = a.party_id.toLowerCase()
      return name.includes(q) || id.includes(q)
    })
  }
  return list
})

const receivableAccounts = computed(() => filteredAccounts.value.filter((a) => Number(a.balance) > 0))

const payableAccounts = computed(() => filteredAccounts.value.filter((a) => Number(a.balance) < 0))

const totalReceivable = computed(() =>
  receivableAccounts.value.reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0)
)

const totalPayable = computed(() => payableAccounts.value.reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0))

const netBalance = computed(() => totalReceivable.value - totalPayable.value)

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(num)
}

const balanceColor = (balance: number) => {
  if (balance > 0) return 'text-success'
  if (balance < 0) return 'text-error'
  return 'text-muted'
}

const partyTypeLabel = (type: string) => (type === 'CUSTOMER' ? 'Cliente' : 'Proveedor')

const goToAccount = (account: CurrentAccount) => {
  router.push(`/erp/treasury/current-accounts/${account.party_id}?currency=${account.currency_code}`)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Cuentas Corrientes" description="Resumen de saldos a cobrar y a pagar" />

    <!-- SUMMARY -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">A cobrar</p>
            <p class="text-lg font-bold text-success">{{ formatCurrency(totalReceivable) }}</p>
            <p class="text-xs text-muted">{{ receivableAccounts.length }} cuentas</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-up-right" class="size-5 text-error" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">A pagar</p>
            <p class="text-lg font-bold text-error">{{ formatCurrency(totalPayable) }}</p>
            <p class="text-xs text-muted">{{ payableAccounts.length }} cuentas</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div
            class="size-10 rounded-lg flex items-center justify-center shrink-0"
            :class="netBalance >= 0 ? 'bg-primary/10' : 'bg-warning/10'"
          >
            <UIcon name="i-lucide-scale" class="size-5" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Saldo neto</p>
            <p class="text-lg font-bold" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'">
              {{ formatCurrency(netBalance) }}
            </p>
            <p class="text-xs text-muted">{{ filteredAccounts.length }} cuentas</p>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- SEARCH -->
    <div class="flex items-center gap-3">
      <UInput v-model="searchQuery" placeholder="Buscar cliente o proveedor..." icon="i-lucide-search" class="flex-1" />
      <USelectMenu
        v-model="filterCurrency"
        :items="[{ label: 'Todas', value: '' }, ...availableCurrencies]"
        placeholder="Moneda"
        class="w-40"
      />
    </div>

    <!-- TWO COLUMNS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      <!-- A COBRAR -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-arrow-down-left" class="size-4 text-success" />
              A cobrar
              <UBadge
                v-if="receivableAccounts.length > 0"
                :label="`${receivableAccounts.length}`"
                color="success"
                variant="soft"
                size="xs"
              />
            </h3>
            <span class="text-sm font-bold text-success">{{ formatCurrency(totalReceivable) }}</span>
          </div>
        </template>
        <div v-if="receivableAccounts.length === 0" class="text-center py-8 text-muted text-sm">
          No hay saldos positivos
        </div>
        <div v-else class="divide-y divide-default">
          <button
            v-for="account in receivableAccounts"
            :key="`${account.party_id}-${account.currency_code}`"
            class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
            @click="goToAccount(account)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-user" class="size-4 text-success" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                <p class="text-xs text-muted">{{ partyTypeLabel(account.party_type) }} · {{ account.currency_code }}</p>
              </div>
            </div>
            <span class="text-sm font-bold text-success shrink-0 ml-3">
              {{ formatCurrency(Number(account.balance), account.currency_code) }}
            </span>
          </button>
        </div>
      </UPageCard>

      <!-- A PAGAR -->
      <UPageCard variant="subtle">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2 py-4">
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-error" />
              A pagar
              <UBadge
                v-if="payableAccounts.length > 0"
                :label="`${payableAccounts.length}`"
                color="error"
                variant="soft"
                size="xs"
              />
            </h3>
            <span class="text-sm font-bold text-error">{{ formatCurrency(totalPayable) }}</span>
          </div>
        </template>
        <div v-if="payableAccounts.length === 0" class="text-center py-8 text-muted text-sm">
          No hay saldos negativos
        </div>
        <div v-else class="divide-y divide-default">
          <button
            v-for="account in payableAccounts"
            :key="`${account.party_id}-${account.currency_code}`"
            class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
            @click="goToAccount(account)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-building-2" class="size-4 text-error" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                <p class="text-xs text-muted">{{ partyTypeLabel(account.party_type) }} · {{ account.currency_code }}</p>
              </div>
            </div>
            <span class="text-sm font-bold text-error shrink-0 ml-3">
              {{ formatCurrency(Math.abs(Number(account.balance)), account.currency_code) }}
            </span>
          </button>
        </div>
      </UPageCard>
    </div>
  </UPage>
</template>
