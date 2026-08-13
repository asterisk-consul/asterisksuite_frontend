<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { useExcelExport } from '~/composables/useExcelExport'
import { isReceivable, classifyAccount, balanceColorClass } from '~/modulos/erp/current-accounts/balance-utils'
import SaldoInicialModal from '~/components/current-account/SaldoInicialModal.vue'

const { activeAccounts, allAccounts, loading, fetchActive, fetchAll } = useCurrentAccounts()
const { exportToExcel } = useExcelExport()
const router = useRouter()

const showSaldoInicialModal = ref(false)

const activeTab = ref('activas')
const searchQuery = ref('')
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

const filteredAccounts = computed(() => {
  let list = activeAccounts.value
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

const receivableAccounts = computed(() => filteredAccounts.value.filter((a) => classifyAccount(Number(a.balance), a.party_type) === 'receivable'))
const payableAccounts = computed(() => filteredAccounts.value.filter((a) => classifyAccount(Number(a.balance), a.party_type) === 'payable'))

const totalReceivable = computed(() =>
  receivableAccounts.value.reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
)
const totalPayable = computed(() =>
  payableAccounts.value.reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
)
const netBalance = computed(() => totalReceivable.value - totalPayable.value)

// =========================
// TAB: HISTORIAL
// =========================

const historySearch = ref('')

const filteredHistory = computed(() => {
  let list = allAccounts.value
  if (filterPartyType.value?.value) {
    list = list.filter((a) => a.party_type === filterPartyType.value!.value)
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

// =========================
// HELPERS
// =========================

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num)
}

const balanceColor = (balance: number, partyType?: string) => balanceColorClass(balance, partyType)

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
  router.push(`/erp/treasury/current-accounts/${account.party_id}`)
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
      { key: 'balance', label: 'Saldo', width: 15, format: (v) => formatCurrency(v) }
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
      { key: 'balance', label: 'Saldo', width: 15, format: (v) => formatCurrency(v) }
    ],
    data: filteredHistory.value.map((a) => ({ ...a, party_name: a.party?.name ?? '' }))
  })
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Cuentas Corrientes" description="Resumen de saldos a cobrar y a pagar (moneda base)" />

    <UTabs v-model="activeTab" :items="tabs" variant="link">
      <!-- ======================== TAB: ACTIVAS ======================== -->
      <template #activas>
        <div class="space-y-6 pt-4">
          <!-- SUMMARY -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <UIcon
                    name="i-lucide-scale"
                    class="size-5"
                    :class="netBalance >= 0 ? 'text-primary' : 'text-warning'"
                  />
                </div>
                <div>
                  <p class="text-xs text-muted font-medium uppercase">Saldo neto</p>
                  <p class="text-lg font-bold" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'">
                    {{ formatCurrency(netBalance) }}
                  </p>
                </div>
              </div>
            </UPageCard>
          </div>

          <!-- SEARCH + EXPORT -->
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              placeholder="Buscar cliente o proveedor..."
              icon="i-lucide-search"
              class="flex-1"
            />
            <UButton
              label="Nuevo saldo inicial"
              icon="i-lucide-plus"
              color="primary"
              variant="solid"
              size="sm"
              @click="showSaldoInicialModal = true"
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
                  <span class="text-sm font-bold text-success">{{ formatCurrency(totalReceivable) }}</span>
                </div>
              </template>
              <div v-if="receivableAccounts.length === 0" class="text-center py-8 text-muted text-sm">
                No hay saldos positivos
              </div>
              <div v-else class="divide-y divide-default">
                <button
                  v-for="account in receivableAccounts"
                  :key="account.party_id"
                  class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
                  @click="goToAccount(account)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-user" class="size-4 text-success" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                      <p class="text-xs text-muted">{{ partyTypeLabel(account.party_type) }}</p>
                    </div>
                  </div>
                  <span class="text-sm font-bold text-success shrink-0 ml-3">
                    {{ formatCurrency(Number(account.balance)) }}
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
                  :key="account.party_id"
                  class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
                  @click="goToAccount(account)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-building-2" class="size-4 text-error" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                      <p class="text-xs text-muted">{{ partyTypeLabel(account.party_type) }}</p>
                    </div>
                  </div>
                  <span class="text-sm font-bold text-error shrink-0 ml-3">
                    {{ formatCurrency(Math.abs(Number(account.balance))) }}
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
                  <th class="text-right py-3 px-4 font-medium text-muted">Saldo</th>
                  <th class="text-right py-3 px-4 font-medium text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr
                  v-for="account in filteredHistory"
                  :key="account.party_id"
                  class="hover:bg-muted/20 transition-colors cursor-pointer"
                  @click="goToAccount(account)"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="size-8 rounded-lg flex items-center justify-center shrink-0"
                        :class="isReceivable(Number(account.balance), account.party_type) ? 'bg-success/10' : 'bg-error/10'"
                      >
                        <UIcon
                          name="i-lucide-user"
                          class="size-4"
                          :class="isReceivable(Number(account.balance), account.party_type) ? 'text-success' : 'text-error'"
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
                  <td class="py-3 px-4 text-right font-semibold" :class="balanceColor(Number(account.balance), account.party_type)">
                    {{ formatCurrency(account.balance) }}
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

    <SaldoInicialModal v-model:open="showSaldoInicialModal" />
  </UPage>
</template>
