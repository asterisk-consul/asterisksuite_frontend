<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { useExcelExport } from '~/composables/useExcelExport'

const { activeAccounts, allAccounts, loading, fetchActive, fetchAll } = useCurrentAccounts()
const { exportToExcel } = useExcelExport()
const router = useRouter()

const activeTab = ref('activas')
const searchQuery = ref('')
const filterCurrency = ref<{ label: string; value: string } | null>(null)
const filterPartyType = ref<{ label: string; value: string } | null>(null)
const filterBalance = ref<{ label: string; value: string } | null>(null)

onMounted(async () => {
  await Promise.all([fetchActive(), fetchAll()])
})

const tabs = [
  { label: 'Activas', value: 'activas', slot: 'activas' },
  { label: 'Historial', value: 'historial', slot: 'historial' }
]

const partyTypeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Cliente', value: 'CUSTOMER' },
  { label: 'Proveedor', value: 'SUPPLIER' },
  { label: 'Empleado', value: 'EMPLOYEE' }
]

const balanceFilterOptions = [
  { label: 'Todos', value: '' },
  { label: 'Saldo positivo', value: 'positive' },
  { label: 'Saldo negativo', value: 'negative' },
  { label: 'Saldo en cero', value: 'zero' }
]

// =========================
// TAB: ACTIVAS
// =========================

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

interface CurrencyTotals {
  receivable: number
  payable: number
  net: number
  receivableCount: number
  payableCount: number
}

const totalsByCurrency = computed(() => {
  const map: Record<string, CurrencyTotals> = {}
  for (const a of filteredAccounts.value) {
    const code = a.currency_code || 'ARS'
    if (!map[code]) map[code] = { receivable: 0, payable: 0, net: 0, receivableCount: 0, payableCount: 0 }
    const num = Number(a.balance) || 0
    if (num > 0) {
      map[code].receivable += num
      map[code].receivableCount++
    } else if (num < 0) {
      map[code].payable += Math.abs(num)
      map[code].payableCount++
    }
    map[code].net += num
  }
  return map
})

const selectedCurrencyTotals = computed(() => {
  if (activeCurrency.value && totalsByCurrency.value[activeCurrency.value]) {
    return { [activeCurrency.value]: totalsByCurrency.value[activeCurrency.value] }
  }
  return totalsByCurrency.value
})

const summaryCurrencies = computed(() => Object.keys(selectedCurrencyTotals.value))

const totalReceivable = computed(() =>
  Object.values(selectedCurrencyTotals.value).reduce((s, t) => s + t.receivable, 0)
)
const totalPayable = computed(() =>
  Object.values(selectedCurrencyTotals.value).reduce((s, t) => s + t.payable, 0)
)

// =========================
// TAB: HISTORIAL
// =========================

const historySearch = ref('')

const filteredHistory = computed(() => {
  let list = allAccounts.value
  if (filterPartyType.value?.value) {
    list = list.filter((a) => a.party_type === filterPartyType.value!.value)
  }
  if (filterCurrency.value?.value) {
    list = list.filter((a) => a.currency_code === filterCurrency.value!.value)
  }
  if (filterBalance.value?.value) {
    const f = filterBalance.value!.value
    if (f === 'positive') list = list.filter((a) => Number(a.balance) > 0)
    else if (f === 'negative') list = list.filter((a) => Number(a.balance) < 0)
    else if (f === 'zero') list = list.filter((a) => Number(a.balance) === 0)
  }
  if (historySearch.value.trim()) {
    const q = historySearch.value.toLowerCase()
    list = list.filter((a) => {
      const name = (a.party?.name ?? '').toLowerCase()
      const taxId = (a.party?.tax_id ?? '').toLowerCase()
      return name.includes(q) || taxId.includes(q)
    })
  }
  return list
})

const historyTotalsByCurrency = computed(() => {
  const map: Record<string, { positive: number; negative: number; net: number; count: number }> = {}
  for (const a of filteredHistory.value) {
    const code = a.currency_code || 'ARS'
    if (!map[code]) map[code] = { positive: 0, negative: 0, net: 0, count: 0 }
    const num = Number(a.balance) || 0
    if (num > 0) map[code].positive += num
    else if (num < 0) map[code].negative += num
    map[code].net += num
    map[code].count++
  }
  return map
})

const historySummaryCurrencies = computed(() => Object.keys(historyTotalsByCurrency.value))

// =========================
// HELPERS
// =========================

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num)
}

const balanceColor = (balance: number) => {
  if (balance > 0) return 'text-success'
  if (balance < 0) return 'text-error'
  return 'text-muted'
}

const partyTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Proveedor',
    EMPLOYEE: 'Empleado',
    PARTNER: 'Socio',
    TAX_AUTHORITY: 'Ente impositivo',
    UTILITY: 'Servicio'
  }
  return labels[type] ?? type
}

const goToAccount = (account: CurrentAccount) => {
  router.push(`/erp/treasury/current-accounts/${account.party_id}?currency=${account.currency_code}`)
}

// =========================
// EXPORTS
// =========================

const exportActive = () => {
  exportToExcel({
    filename: 'cuentas_corrientes_activas',
    sheetName: 'Activas',
    columns: [
      { key: 'party_name', label: 'Tercero', width: 30 },
      { key: 'party_type', label: 'Tipo', width: 15, format: (v) => partyTypeLabel(v) },
      { key: 'currency_code', label: 'Moneda', width: 10 },
      { key: 'balance', label: 'Saldo', width: 15, format: (v, row) => formatCurrency(v, row.currency_code) }
    ],
    data: filteredAccounts.value.map((a) => ({ ...a, party_name: a.party?.name ?? '' }))
  })
}

const exportHistory = () => {
  exportToExcel({
    filename: 'historial_cuentas_corrientes',
    sheetName: 'Historial',
    columns: [
      { key: 'party_name', label: 'Tercero', width: 30 },
      { key: 'party_type', label: 'Tipo', width: 15, format: (v) => partyTypeLabel(v) },
      { key: 'currency_code', label: 'Moneda', width: 10 },
      { key: 'balance', label: 'Saldo', width: 15, format: (v, row) => formatCurrency(v, row.currency_code) }
    ],
    data: filteredHistory.value.map((a) => ({ ...a, party_name: a.party?.name ?? '' }))
  })
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Cuentas Corrientes" description="Resumen de saldos a cobrar y a pagar" />

    <UTabs v-model="activeTab" :items="tabs" variant="link">
      <!-- ======================== TAB: ACTIVAS ======================== -->
      <template #activas>
        <div class="space-y-6 pt-4">
          <!-- SUMMARY -->
          <div class="space-y-3">
            <template v-for="currency in summaryCurrencies" :key="currency">
              <div v-if="summaryCurrencies.length > 1" class="flex items-center gap-2">
                <UBadge :label="currency" size="sm" variant="soft" color="neutral" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UPageCard variant="subtle">
                  <div class="flex items-center gap-4">
                    <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
                    </div>
                    <div>
                      <p class="text-xs text-muted font-medium uppercase">A cobrar</p>
                      <p class="text-lg font-bold text-success">{{ formatCurrency(selectedCurrencyTotals[currency].receivable, currency) }}</p>
                      <p class="text-xs text-muted">{{ selectedCurrencyTotals[currency].receivableCount }} cuentas</p>
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
                      <p class="text-lg font-bold text-error">{{ formatCurrency(selectedCurrencyTotals[currency].payable, currency) }}</p>
                      <p class="text-xs text-muted">{{ selectedCurrencyTotals[currency].payableCount }} cuentas</p>
                    </div>
                  </div>
                </UPageCard>
                <UPageCard variant="subtle">
                  <div class="flex items-center gap-4">
                    <div
                      class="size-10 rounded-lg flex items-center justify-center shrink-0"
                      :class="selectedCurrencyTotals[currency].net >= 0 ? 'bg-primary/10' : 'bg-warning/10'"
                    >
                      <UIcon
                        name="i-lucide-scale"
                        class="size-5"
                        :class="selectedCurrencyTotals[currency].net >= 0 ? 'text-primary' : 'text-warning'"
                      />
                    </div>
                    <div>
                      <p class="text-xs text-muted font-medium uppercase">Saldo neto · {{ currency }}</p>
                      <p class="text-lg font-bold" :class="selectedCurrencyTotals[currency].net >= 0 ? 'text-primary' : 'text-warning'">
                        {{ formatCurrency(selectedCurrencyTotals[currency].net, currency) }}
                      </p>
                    </div>
                  </div>
                </UPageCard>
              </div>
            </template>
            <div v-if="summaryCurrencies.length === 0" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UPageCard variant="subtle">
                <div class="flex items-center gap-4">
                  <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
                  </div>
                  <div>
                    <p class="text-xs text-muted font-medium uppercase">A cobrar</p>
                    <p class="text-lg font-bold text-success">$0.00</p>
                    <p class="text-xs text-muted">0 cuentas</p>
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
                    <p class="text-lg font-bold text-error">$0.00</p>
                    <p class="text-xs text-muted">0 cuentas</p>
                  </div>
                </div>
              </UPageCard>
              <UPageCard variant="subtle">
                <div class="flex items-center gap-4">
                  <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-scale" class="size-5 text-primary" />
                  </div>
                  <div>
                    <p class="text-xs text-muted font-medium uppercase">Saldo neto</p>
                    <p class="text-lg font-bold text-primary">$0.00</p>
                    <p class="text-xs text-muted">0 cuentas</p>
                  </div>
                </div>
              </UPageCard>
            </div>
          </div>

          <!-- SEARCH + EXPORT -->
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              placeholder="Buscar cliente o proveedor..."
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu
              v-model="filterCurrency"
              :items="[{ label: 'Todas', value: '' }, ...availableCurrencies]"
              placeholder="Moneda"
              class="w-40"
            />
            <UButton
              label="Exportar Excel"
              icon="i-lucide-download"
              variant="outline"
              size="sm"
              @click="exportActive"
            />
          </div>

          <!-- TWO COLUMNS -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="currency in summaryCurrencies"
                      :key="'recv-' + currency"
                      class="text-sm font-bold text-success"
                    >
                      {{ formatCurrency(selectedCurrencyTotals[currency].receivable, currency) }}
                    </span>
                  </div>
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
                      <p class="text-xs text-muted">
                        {{ partyTypeLabel(account.party_type) }} · {{ account.currency_code }}
                      </p>
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
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="currency in summaryCurrencies"
                      :key="'pay-' + currency"
                      class="text-sm font-bold text-error"
                    >
                      {{ formatCurrency(selectedCurrencyTotals[currency].payable, currency) }}
                    </span>
                  </div>
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
                      <p class="text-xs text-muted">
                        {{ partyTypeLabel(account.party_type) }} · {{ account.currency_code }}
                      </p>
                    </div>
                  </div>
                  <span class="text-sm font-bold text-error shrink-0 ml-3">
                    {{ formatCurrency(Math.abs(Number(account.balance)), account.currency_code) }}
                  </span>
                </button>
              </div>
            </UPageCard>
          </div>
        </div>
      </template>

      <!-- ======================== TAB: HISTORIAL ======================== -->
      <template #historial>
        <div class="space-y-4 pt-4">
          <!-- FILTERS -->
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="historySearch"
              placeholder="Buscar por nombre o CUIT..."
              icon="i-lucide-search"
              class="flex-1 min-w-[200px]"
            />
            <USelectMenu v-model="filterPartyType" :items="partyTypeOptions" placeholder="Tipo" class="w-40" />
            <USelectMenu v-model="filterBalance" :items="balanceFilterOptions" placeholder="Saldo" class="w-44" />
            <UButton
              label="Exportar Excel"
              icon="i-lucide-download"
              variant="outline"
              size="sm"
              @click="exportHistory"
            />
          </div>

          <!-- SUMMARY BAR -->
          <div v-if="historySummaryCurrencies.length > 0" class="border border-default rounded-lg overflow-hidden text-sm">
            <table class="w-full">
              <thead class="bg-muted/30">
                <tr>
                  <th class="text-left py-2 px-3 font-medium text-muted">Moneda</th>
                  <th class="text-right py-2 px-3 font-medium text-success">A cobrar</th>
                  <th class="text-right py-2 px-3 font-medium text-error">A pagar</th>
                  <th class="text-right py-2 px-3 font-medium text-muted">Neto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="currency in historySummaryCurrencies" :key="'hist-' + currency">
                  <td class="py-2 px-3 font-semibold">{{ currency }}</td>
                  <td class="py-2 px-3 text-right text-success font-semibold">
                    {{ formatCurrency(historyTotalsByCurrency[currency].positive, currency) }}
                  </td>
                  <td class="py-2 px-3 text-right text-error font-semibold">
                    {{ formatCurrency(historyTotalsByCurrency[currency].negative, currency) }}
                  </td>
                  <td class="py-2 px-3 text-right font-semibold"
                      :class="historyTotalsByCurrency[currency].net >= 0 ? 'text-primary' : 'text-warning'">
                    {{ formatCurrency(historyTotalsByCurrency[currency].net, currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-muted">{{ filteredHistory.length }} cuentas</p>

          <!-- TABLE -->
          <div v-if="loading" class="flex justify-center py-12">
            <ULoader />
          </div>
          <div v-else-if="filteredHistory.length === 0" class="text-center py-12 text-muted">
            <UIcon name="i-lucide-file-search" class="size-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron cuentas</p>
          </div>
          <div v-else class="border border-default rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-muted/30">
                <tr>
                  <th class="text-left py-3 px-4 font-medium text-muted">Tercero</th>
                  <th class="text-left py-3 px-4 font-medium text-muted">Tipo</th>
                  <th class="text-left py-3 px-4 font-medium text-muted">Moneda</th>
                  <th class="text-right py-3 px-4 font-medium text-muted">Saldo</th>
                  <th class="text-right py-3 px-4 font-medium text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr
                  v-for="account in filteredHistory"
                  :key="`${account.party_id}-${account.currency_code}`"
                  class="hover:bg-muted/20 transition-colors cursor-pointer"
                  @click="goToAccount(account)"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="size-8 rounded-lg flex items-center justify-center shrink-0"
                        :class="Number(account.balance) >= 0 ? 'bg-success/10' : 'bg-error/10'"
                      >
                        <UIcon
                          name="i-lucide-user"
                          class="size-4"
                          :class="Number(account.balance) >= 0 ? 'text-success' : 'text-error'"
                        />
                      </div>
                      <div>
                        <p class="font-medium">{{ account.party?.name ?? 'Sin nombre' }}</p>
                        <p v-if="account.party?.tax_id" class="text-xs text-muted">CUIT: {{ account.party.tax_id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <UBadge
                      :label="partyTypeLabel(account.party_type)"
                      size="xs"
                      variant="soft"
                      :color="
                        account.party_type === 'CUSTOMER'
                          ? 'success'
                          : account.party_type === 'SUPPLIER'
                            ? 'error'
                            : 'neutral'
                      "
                    />
                  </td>
                  <td class="py-3 px-4">{{ account.currency_code }}</td>
                  <td class="py-3 px-4 text-right font-semibold" :class="balanceColor(Number(account.balance))">
                    {{ formatCurrency(account.balance, account.currency_code) }}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <UButton icon="i-lucide-eye" variant="ghost" size="xs" @click.stop="goToAccount(account)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </UTabs>
  </UPage>
</template>
