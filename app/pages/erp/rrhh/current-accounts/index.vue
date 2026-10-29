<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import type { HrAccount } from '~/modulos/erp/hr/types/hr.types'
import { balanceColorClass } from '~/modulos/erp/current-accounts/balance-utils'

const hrStore = useHrStore()
const { accounts: allAccounts, loading } = storeToRefs(hrStore)
const activeAccounts = computed(() => allAccounts.value.filter(account => account.active && Number(account.balance) !== 0))
const router = useRouter()

const activeTab = ref('activas')
const searchQuery = ref('')
const filterPartyType = ref<{ label: string; value: string } | undefined>(undefined)

onMounted(async () => {
  await hrStore.fetchAccounts({ party_type: 'EMPLOYEE,PARTNER' })
})

const tabs = [
  { label: 'Activas', value: 'activas', slot: 'activas' },
  { label: 'Historial', value: 'historial', slot: 'historial' }
]

const partyTypeOptions = [
  { label: 'Empleados', value: 'EMPLOYEE' },
  { label: 'Socios', value: 'PARTNER' }
]

// =========================
// TAB: ACTIVAS (solo EMPLOYEE/PARTNER)
// =========================

const rrhhActiveAccounts = computed(() =>
  activeAccounts.value.filter((a) => a.party_type === 'EMPLOYEE' || a.party_type === 'PARTNER')
)

const filteredActive = computed(() => {
  let list = rrhhActiveAccounts.value
  if (filterPartyType.value?.value) {
    list = list.filter((a) => a.party_type === filterPartyType.value!.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((a) => {
      const name = (a.party?.name ?? '').toLowerCase()
      return name.includes(q)
    })
  }
  return list
})

const partnerAccounts = computed(() => filteredActive.value.filter((account) => account.party_type === 'PARTNER'))
const employeeAccounts = computed(() => filteredActive.value.filter((account) => account.party_type === 'EMPLOYEE'))

// =========================
// TAB: HISTORIAL
// =========================

const historySearch = ref('')

const filteredHistory = computed(() => {
  let list = allAccounts.value.filter((a) => a.party_type === 'EMPLOYEE' || a.party_type === 'PARTNER')
  if (filterPartyType.value?.value) {
    list = list.filter((a) => a.party_type === filterPartyType.value!.value)
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
    EMPLOYEE: 'Empleado',
    PARTNER: 'Socio'
  }
  return labels[type] ?? type
}

const partyTypeBadgeColor = (type: string) => {
  return type === 'EMPLOYEE' ? 'info' : 'warning'
}

const goToAccount = (account: HrAccount) => {
  router.push(`/erp/rrhh/current-accounts/${account.id}`)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Ctas Ctes RRHH" description="Cuentas corrientes de empleados y socios" />

    <UTabs v-model="activeTab" :items="tabs" variant="link">
      <!-- ======================== TAB: ACTIVAS ======================== -->
      <template #activas>
        <div class="space-y-6 pt-4">
          <!-- SEARCH + FILTERS -->
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              placeholder="Buscar empleado o socio..."
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu v-model="filterPartyType" :items="partyTypeOptions" placeholder="Tipo" class="w-40" />
          </div>

          <!-- TWO COLUMNS -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- SOCIOS -->
            <UPageCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold flex items-center gap-2">
                    <UIcon name="i-lucide-users-round" class="size-4 text-warning" />
                    Socios
                    <UBadge
                      v-if="partnerAccounts.length > 0"
                      :label="`${partnerAccounts.length}`"
                      color="warning"
                      variant="soft"
                      size="xs"
                    />
                  </h3>
                </div>
              </template>
              <div v-if="partnerAccounts.length === 0" class="text-center py-8 text-muted text-sm">
                No hay cuentas de socios con saldo
              </div>
              <div v-else class="min-h-[19rem] max-h-[22rem] overflow-y-auto overscroll-contain divide-y divide-default pr-2">
                <button
                  v-for="account in partnerAccounts"
                  :key="`${account.party_id}-${account.currency_code}`"
                  class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
                  @click="goToAccount(account)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-user-round" class="size-4 text-warning" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                      <p class="text-xs text-muted">
                        <UBadge
                          :label="partyTypeLabel(account.party_type)"
                          size="xs"
                          variant="soft"
                          :color="partyTypeBadgeColor(account.party_type)"
                        />
                        · {{ account.currency_code }}
                      </p>
                    </div>
                  </div>
                  <span class="text-sm font-bold shrink-0 ml-3" :class="balanceColor(Number(account.balance), account.party_type)">
                    {{ formatCurrency(account.balance, account.currency_code) }}
                  </span>
                </button>
              </div>
            </UPageCard>

            <!-- EMPLEADOS -->
            <UPageCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold flex items-center gap-2 py-4">
                    <UIcon name="i-lucide-users-round" class="size-4 text-info" />
                    Empleados
                    <UBadge
                      v-if="employeeAccounts.length > 0"
                      :label="`${employeeAccounts.length}`"
                      color="info"
                      variant="soft"
                      size="xs"
                    />
                  </h3>
                </div>
              </template>
              <div v-if="employeeAccounts.length === 0" class="text-center py-8 text-muted text-sm">
                No hay cuentas de empleados con saldo
              </div>
              <div v-else class="min-h-[19rem] max-h-[22rem] overflow-y-auto overscroll-contain divide-y divide-default pr-2">
                <button
                  v-for="account in employeeAccounts"
                  :key="`${account.party_id}-${account.currency_code}`"
                  class="flex items-center justify-between w-full py-3 px-1 first:pt-0 last:pb-0 hover:bg-muted/30 transition-colors -mx-1 rounded text-left"
                  @click="goToAccount(account)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-user-round" class="size-4 text-info" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ account.party?.name ?? 'Sin nombre' }}</p>
                      <p class="text-xs text-muted">
                        <UBadge
                          :label="partyTypeLabel(account.party_type)"
                          size="xs"
                          variant="soft"
                          :color="partyTypeBadgeColor(account.party_type)"
                        />
                        · {{ account.currency_code }}
                      </p>
                    </div>
                  </div>
                  <span class="text-sm font-bold shrink-0 ml-3" :class="balanceColor(Number(account.balance), account.party_type)">
                    {{ formatCurrency(account.balance, account.currency_code) }}
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
          </div>

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
                  <th class="text-left py-3 px-4 font-medium text-muted">Persona</th>
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
                        :class="account.party_type === 'EMPLOYEE' ? 'bg-info/10' : 'bg-warning/10'"
                      >
                        <UIcon
                          name="i-lucide-user"
                          class="size-4"
                          :class="account.party_type === 'EMPLOYEE' ? 'text-info' : 'text-warning'"
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
                      :color="partyTypeBadgeColor(account.party_type)"
                    />
                  </td>
                  <td class="py-3 px-4">{{ account.currency_code }}</td>
                  <td class="py-3 px-4 text-right font-semibold" :class="balanceColor(Number(account.balance), account.party_type)">
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
