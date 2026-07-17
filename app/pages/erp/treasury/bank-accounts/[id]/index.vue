<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { bankMovementColumns, MOVEMENT_TYPE_CONFIG } from '~/modulos/erp/bank-accounts/movement-columns'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const accountId = route.params.id as string

const { current: account, movements, fetchOne, fetchMovements, loading } = useBankAccounts()

const sorting = ref<SortingState>([])

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

onMounted(async () => {
  await fetchOne(accountId)
  await fetchMovements(accountId)
})

const formatCurrency = (amount: number | string | null | undefined, code?: string) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: code || 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

const CURRENCY_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  ARS: { label: 'Peso argentino', color: 'text-primary', icon: '🟢', bg: 'bg-primary/10' },
  USD: { label: 'Dólar', color: 'text-success', icon: '💵', bg: 'bg-success/10' },
  EUR: { label: 'Euro', color: 'text-info', icon: '💶', bg: 'bg-info/10' },
  BRL: { label: 'Real', color: 'text-warning', icon: '🇧🇷', bg: 'bg-warning/10' },
}

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  SAVINGS: { label: 'Caja de ahorro', icon: 'i-lucide-piggy-bank' },
  CHECKING: { label: 'Cuenta corriente', icon: 'i-lucide-landmark' },
  SALARY: { label: 'Cuenta sueldo', icon: 'i-lucide-wallet' },
  OTHER: { label: 'Otra', icon: 'i-lucide-circle-dot' }
}

const getCurrencyConfig = (code: string) => CURRENCY_CONFIG[code] ?? { label: code, color: 'text-muted', icon: '💰', bg: 'bg-muted/10' }
const getAccountTypeConfig = (type: string) => ACCOUNT_TYPE_CONFIG[type] ?? { label: type, icon: 'i-lucide-circle-dot' }

const totalIn = computed(() =>
  movements.value
    .filter(m => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'in')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
)

const totalOut = computed(() =>
  movements.value
    .filter(m => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'out')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
)

const columns = bankMovementColumns({ onSortFieldSelect })

const filterFields: FilterField[] = [
  { id: 'type', label: 'Filtrar por tipo...', class: 'w-40' },
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Saldo', value: 'balance_after' }
]

const links = computed(() => [
  { label: 'Volver', icon: 'i-lucide-arrow-left', variant: 'ghost' as const, onClick: () => router.push('/erp/treasury/bank-accounts') }
])
</script>

<template>
  <UPage v-if="account" class="space-y-6 px-4">
    <AppPageHeader
      :title="account.name"
      :description="`${account.bank_name} · ${getAccountTypeConfig(account.account_type).label} · ${account.currency_code}`"
      :links="links"
    />

    <!-- ACCOUNT INFO -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo actual</p>
          <p class="text-2xl font-bold mt-1" :class="Number(account.balance) >= 0 ? 'text-foreground' : 'text-error'">
            {{ formatCurrency(account.balance, account.currency_code) }}
          </p>
          <p class="text-xs text-muted mt-1">
            <span :class="getCurrencyConfig(account.currency_code).color">{{ getCurrencyConfig(account.currency_code).icon }}</span>
            {{ getCurrencyConfig(account.currency_code).label }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total ingresos</p>
          <p class="text-xl font-bold mt-1 text-success">{{ formatCurrency(totalIn, account.currency_code) }}</p>
          <p class="text-xs text-muted mt-1">{{ movements.filter(m => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'in').length }} movimientos</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total egresos</p>
          <p class="text-xl font-bold mt-1 text-error">{{ formatCurrency(totalOut, account.currency_code) }}</p>
          <p class="text-xs text-muted mt-1">{{ movements.filter(m => MOVEMENT_TYPE_CONFIG[m.type]?.side === 'out').length }} movimientos</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Datos cuenta</p>
          <div class="mt-2 space-y-1">
            <p v-if="account.cbu" class="text-xs"><span class="text-muted">CBU:</span> <span class="font-mono font-medium">{{ account.cbu }}</span></p>
            <p v-if="account.alias" class="text-xs"><span class="text-muted">Alias:</span> <span class="font-medium">{{ account.alias }}</span></p>
            <p v-if="account.account_number" class="text-xs"><span class="text-muted">N°:</span> <span class="font-mono font-medium">{{ account.account_number }}</span></p>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- MOVEMENTS TABLE -->
    <UPageCard variant="subtle">
      <template #header>
        <h3 class="text-sm font-semibold">Historial de movimientos</h3>
      </template>
      <div class="overflow-x-auto">
        <LogisticaTable
          :loading="loading"
          :data="movements"
          :columns="columns"
          :filter-fields="filterFields"
          :sort-fields="sortFields"
          v-model:sorting="sorting"
        />
      </div>
    </UPageCard>
  </UPage>
</template>
