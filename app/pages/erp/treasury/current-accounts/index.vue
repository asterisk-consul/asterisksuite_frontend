<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { useExcelExport } from '~/composables/useExcelExport'
import { isReceivable, getBalanceInfo } from '~/modulos/erp/current-accounts/balance-utils'
import { getActivityInfo } from '~/modulos/erp/current-accounts/utils'
import SaldoInicialModal from '~/components/current-account/SaldoInicialModal.vue'

const { activeAccounts, allAccounts, loading, fetchActive, fetchAll } = useCurrentAccounts()
const { exportToExcel } = useExcelExport()
const router = useRouter()

const showSaldoInicialModal = ref(false)

const activeTab = ref('activas')
const searchQuery = ref('')
const filterPartyType = ref<{ label: string; value: string } | null>(null)
const filterBalance = ref<{ label: string; value: string } | null>(null)

const VISIBLE_LIMIT = 10
const showAllCustomers = ref(false)
const showAllSuppliers = ref(false)

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
// TAB: ACTIVAS — Grouping
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

/** Priority sort: primary balance first, then secondary, then zero */
function getSortPriority(account: CurrentAccount): number {
  const info = getBalanceInfo(Number(account.balance), account.party_type)
  if (info.priority === 'primary') return 2
  if (info.priority === 'secondary') return 1
  return 0
}

const customerAccounts = computed(() =>
  filteredAccounts.value
    .filter(a => a.party_type === 'CUSTOMER')
    .sort((a, b) => getSortPriority(b) - getSortPriority(a))
)

const supplierAccounts = computed(() =>
  filteredAccounts.value
    .filter(a => a.party_type === 'SUPPLIER')
    .sort((a, b) => getSortPriority(b) - getSortPriority(a))
)

// "Ver más" logic
const visibleCustomerAccounts = computed(() =>
  showAllCustomers.value ? customerAccounts.value : customerAccounts.value.slice(0, VISIBLE_LIMIT)
)
const visibleSupplierAccounts = computed(() =>
  showAllSuppliers.value ? supplierAccounts.value : supplierAccounts.value.slice(0, VISIBLE_LIMIT)
)

// Summary totals
const totalCustomerReceivable = computed(() =>
  customerAccounts.value
    .filter(a => isReceivable(Number(a.balance), 'CUSTOMER'))
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
)
const totalSupplierPayable = computed(() =>
  supplierAccounts.value
    .filter(a => !isReceivable(Number(a.balance), 'SUPPLIER'))
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
)
const totalReceivable = computed(() =>
  filteredAccounts.value
    .filter(a => isReceivable(Number(a.balance), a.party_type))
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
)
const totalPayable = computed(() =>
  filteredAccounts.value
    .filter(a => !isReceivable(Number(a.balance), a.party_type))
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
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
      { key: 'last_activity', label: 'Última actividad', width: 20, format: (v) => v ?? 'Sin actividad' },
      { key: 'balance', label: 'Saldo', width: 15, format: (v) => formatCurrency(v) }
    ],
    data: filteredAccounts.value.map((a) => ({
      ...a,
      party_name: a.party?.name ?? '',
      last_activity: getActivityInfo(a.last_entry_date, a.last_entry).lastMovementLabel,
    }))
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
                  <p class="text-xs text-muted">{{ filteredAccounts.filter(a => isReceivable(Number(a.balance), a.party_type)).length }} cuentas</p>
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
                  <p class="text-xs text-muted">{{ filteredAccounts.filter(a => !isReceivable(Number(a.balance), a.party_type)).length }} cuentas</p>
                </div>
              </div>
            </UPageCard>
            <UPageCard variant="subtle">
              <div class="flex items-center gap-4">
                <div class="size-10 rounded-lg flex items-center justify-center shrink-0" :class="netBalance >= 0 ? 'bg-primary/10' : 'bg-warning/10'">
                  <UIcon name="i-lucide-scale" class="size-5" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'" />
                </div>
                <div>
                  <p class="text-xs text-muted font-medium uppercase">Saldo neto</p>
                  <p class="text-lg font-bold" :class="netBalance >= 0 ? 'text-primary' : 'text-warning'">{{ formatCurrency(netBalance) }}</p>
                </div>
              </div>
            </UPageCard>
          </div>

          <!-- SEARCH + ACTIONS -->
          <div class="flex items-center gap-3">
            <UInput v-model="searchQuery" placeholder="Buscar cliente o proveedor..." icon="i-lucide-search" class="flex-1" />
            <UButton label="Nuevo saldo inicial" icon="i-lucide-plus" color="primary" variant="solid" size="sm" @click="showSaldoInicialModal = true" />
            <UButton label="Exportar Excel" icon="i-lucide-download" variant="outline" size="sm" @click="exportActive" />
          </div>

          <!-- ======================== CLIENTES + PROVEEDORES ======================== -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- ======================== CLIENTES ======================== -->
          <div v-if="customerAccounts.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-users" class="size-4 text-primary" />
                Clientes
                <UBadge :label="`${customerAccounts.length}`" color="primary" variant="soft" size="xs" />
              </h3>
              <span class="text-sm font-bold text-success">{{ formatCurrency(totalCustomerReceivable) }} a cobrar</span>
            </div>
            <div class="divide-y divide-default border border-default rounded-lg overflow-hidden">
              <button
                v-for="account in visibleCustomerAccounts"
                :key="account.party_id"
                class="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/30 transition-colors text-left"
                @click="goToAccount(account)"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="size-8 rounded-lg flex items-center justify-center shrink-0" :class="getBalanceInfo(Number(account.balance), account.party_type).color === 'success' ? 'bg-success/10' : 'bg-error/10'">
                    <UIcon name="i-lucide-user" class="size-4" :class="getBalanceInfo(Number(account.balance), account.party_type).color === 'success' ? 'text-success' : 'text-error'" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                    <p class="text-xs text-muted">CUIT: {{ account.party?.tax_id ?? '—' }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <UBadge
                        :label="getActivityInfo(account.last_entry_date, account.last_entry).label"
                        :color="getActivityInfo(account.last_entry_date, account.last_entry).color"
                        size="xs"
                        variant="soft"
                      />
                      <span class="text-[11px] text-muted truncate">
                        Último: {{ getActivityInfo(account.last_entry_date, account.last_entry).lastMovementLabel }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                  <UBadge
                    :label="getBalanceInfo(Number(account.balance), 'CUSTOMER').label"
                    :color="getBalanceInfo(Number(account.balance), 'CUSTOMER').color"
                    :size="getBalanceInfo(Number(account.balance), 'CUSTOMER').priority === 'primary' ? 'md' : 'sm'"
                    variant="subtle"
                  />
                  <p class="text-sm font-bold mt-1" :class="isReceivable(Number(account.balance), 'CUSTOMER') ? 'text-success' : 'text-error'">
                    {{ formatCurrency(Number(account.balance)) }}
                  </p>
                </div>
              </button>
            </div>
            <UButton
              v-if="customerAccounts.length > VISIBLE_LIMIT && !showAllCustomers"
              :label="`Ver todos los clientes (${customerAccounts.length})`"
              variant="ghost"
              color="primary"
              size="sm"
              icon="i-lucide-chevron-down"
              @click="showAllCustomers = true"
            />
            <UButton
              v-if="showAllCustomers && customerAccounts.length > VISIBLE_LIMIT"
              label="Mostrar menos"
              variant="ghost"
              color="primary"
              size="sm"
              icon="i-lucide-chevron-up"
              @click="showAllCustomers = false"
            />
          </div>

          <!-- ======================== PROVEEDORES ======================== -->
          <div v-if="supplierAccounts.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-building-2" class="size-4 text-warning" />
                Proveedores
                <UBadge :label="`${supplierAccounts.length}`" color="warning" variant="soft" size="xs" />
              </h3>
              <span class="text-sm font-bold text-error">{{ formatCurrency(totalSupplierPayable) }} a pagar</span>
            </div>
            <div class="divide-y divide-default border border-default rounded-lg overflow-hidden">
              <button
                v-for="account in visibleSupplierAccounts"
                :key="account.party_id"
                class="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/30 transition-colors text-left"
                @click="goToAccount(account)"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="size-8 rounded-lg flex items-center justify-center shrink-0" :class="getBalanceInfo(Number(account.balance), account.party_type).color === 'error' ? 'bg-error/10' : 'bg-success/10'">
                    <UIcon name="i-lucide-building-2" class="size-4" :class="getBalanceInfo(Number(account.balance), account.party_type).color === 'error' ? 'text-error' : 'text-success'" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                    <p class="text-xs text-muted">CUIT: {{ account.party?.tax_id ?? '—' }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <UBadge
                        :label="getActivityInfo(account.last_entry_date, account.last_entry).label"
                        :color="getActivityInfo(account.last_entry_date, account.last_entry).color"
                        size="xs"
                        variant="soft"
                      />
                      <span class="text-[11px] text-muted truncate">
                        Último: {{ getActivityInfo(account.last_entry_date, account.last_entry).lastMovementLabel }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                  <UBadge
                    :label="getBalanceInfo(Number(account.balance), 'SUPPLIER').label"
                    :color="getBalanceInfo(Number(account.balance), 'SUPPLIER').color"
                    :size="getBalanceInfo(Number(account.balance), 'SUPPLIER').priority === 'primary' ? 'md' : 'sm'"
                    variant="subtle"
                  />
                  <p class="text-sm font-bold mt-1" :class="isReceivable(Number(account.balance), 'SUPPLIER') ? 'text-success' : 'text-error'">
                    {{ formatCurrency(Number(account.balance)) }}
                  </p>
                </div>
              </button>
            </div>
            <UButton
              v-if="supplierAccounts.length > VISIBLE_LIMIT && !showAllSuppliers"
              :label="`Ver todos los proveedores (${supplierAccounts.length})`"
              variant="ghost"
              color="primary"
              size="sm"
              icon="i-lucide-chevron-down"
              @click="showAllSuppliers = true"
            />
            <UButton
              v-if="showAllSuppliers && supplierAccounts.length > VISIBLE_LIMIT"
              label="Mostrar menos"
              variant="ghost"
              color="primary"
              size="sm"
              icon="i-lucide-chevron-up"
              @click="showAllSuppliers = false"
            />
          </div>

          </div> <!-- /grid 2 columnas -->

          <!-- Empty state -->
          <div v-if="customerAccounts.length === 0 && supplierAccounts.length === 0 && !loading" class="text-center py-12 text-muted">
            <UIcon name="i-lucide-inbox" class="size-12 mx-auto mb-3 opacity-30" />
            <p>No hay cuentas con saldo</p>
          </div>
        </div>
      </template>

      <!-- ======================== TAB: HISTORIAL ======================== -->
      <template #historial>
        <div class="space-y-4 pt-4">
          <div class="flex flex-wrap items-center gap-3">
            <UInput v-model="historySearch" placeholder="Buscar por nombre o CUIT..." icon="i-lucide-search" class="flex-1 min-w-[200px]" />
            <USelectMenu v-model="filterPartyType" :items="partyTypeOptions" placeholder="Tipo" class="w-40" />
            <USelectMenu v-model="filterBalance" :items="balanceFilterOptions" placeholder="Saldo" class="w-44" />
            <UButton label="Exportar Excel" icon="i-lucide-download" variant="outline" size="sm" @click="exportHistory" />
          </div>

          <p class="text-xs text-muted">{{ filteredHistory.length }} cuentas</p>

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
                  <th class="text-left py-3 px-4 font-medium text-muted">Última actividad</th>
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
                      <div class="size-8 rounded-lg flex items-center justify-center shrink-0" :class="isReceivable(Number(account.balance), account.party_type) ? 'bg-success/10' : 'bg-error/10'">
                        <UIcon name="i-lucide-user" class="size-4" :class="isReceivable(Number(account.balance), account.party_type) ? 'text-success' : 'text-error'" />
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
                      :color="account.party_type === 'CUSTOMER' ? 'success' : account.party_type === 'SUPPLIER' ? 'error' : 'neutral'"
                    />
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <UBadge
                        :label="getActivityInfo(account.last_entry_date, account.last_entry).label"
                        :color="getActivityInfo(account.last_entry_date, account.last_entry).color"
                        size="xs"
                        variant="soft"
                      />
                      <span class="text-xs text-muted truncate max-w-[180px]">
                        {{ getActivityInfo(account.last_entry_date, account.last_entry).lastMovementLabel }}
                      </span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right font-semibold" :class="isReceivable(Number(account.balance), account.party_type) ? 'text-success' : 'text-error'">
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
