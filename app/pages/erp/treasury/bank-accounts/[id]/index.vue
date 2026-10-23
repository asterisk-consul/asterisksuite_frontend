<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { bankMovementColumns, getMovementSignedAmount } from '~/modulos/erp/bank-accounts/movement-columns'
import RegisterBankMovementModal from '~/modulos/erp/bank-accounts/components/RegisterBankMovementModal.vue'
import BankChargeRulesPanel from '~/modulos/erp/bank-accounts/components/BankChargeRulesPanel.vue'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const accountId = route.params.id as string

const { current: account, movements, bankAccounts, init, createTransfer, fetchOne, fetchMovements, loading } = useBankAccounts()

const movementModalOpen = ref(false)
const transferModalOpen = ref(false)
const transferring = ref(false)
const toast = useToast()
const transferDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const transferForm = reactive({ destination_bank_account_id: '', amount: 0, date: transferDate(), reference: '', notes: '' })

useBreadcrumbEntityLabel(
  `/erp/treasury/bank-accounts/${accountId}`,
  computed(() => account.value?.name)
)

const sorting = ref<SortingState>([])

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

onMounted(async () => {
  await Promise.all([fetchOne(accountId), init()])
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
  BRL: { label: 'Real', color: 'text-warning', icon: '🇧🇷', bg: 'bg-warning/10' }
}

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  SAVINGS: { label: 'Caja de ahorro', icon: 'i-lucide-piggy-bank' },
  CHECKING: { label: 'Cuenta corriente', icon: 'i-lucide-landmark' },
  SALARY: { label: 'Cuenta sueldo', icon: 'i-lucide-wallet' },
  VIRTUAL_WALLET: { label: 'Billetera virtual', icon: 'i-lucide-wallet-cards' },
  OTHER: { label: 'Otra', icon: 'i-lucide-circle-dot' }
}

const getCurrencyConfig = (code: string) =>
  CURRENCY_CONFIG[code] ?? { label: code, color: 'text-muted', icon: '💰', bg: 'bg-muted/10' }
const getAccountTypeConfig = (type: string) => ACCOUNT_TYPE_CONFIG[type] ?? { label: type, icon: 'i-lucide-circle-dot' }
const isInternalTransfer = (movement: any) => movement.reference_type === 'bank_account_transfer'

const totalIn = computed(() =>
  movements.value
    .filter(movement => !isInternalTransfer(movement))
    .map(getMovementSignedAmount)
    .filter(amount => amount > 0)
    .reduce((sum, amount) => sum + amount, 0)
)

const totalOut = computed(() =>
  movements.value
    .filter(movement => !isInternalTransfer(movement))
    .map(getMovementSignedAmount)
    .filter(amount => amount < 0)
    .reduce((sum, amount) => sum + Math.abs(amount), 0)
)

const realBalance = computed(() => Number(account.value?.balance ?? 0))

const incomeMovementCount = computed(() =>
  movements.value.filter(movement => !isInternalTransfer(movement) && getMovementSignedAmount(movement) > 0).length
)

const expenseMovementCount = computed(() =>
  movements.value.filter(movement => !isInternalTransfer(movement) && getMovementSignedAmount(movement) < 0).length
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

const goBack = () => {
  router.push('/erp/treasury/bank-accounts')
}

const links = computed(() => [
  {
    label: 'Volver',
    icon: 'i-lucide-arrow-left',
    variant: 'ghost' as const,
    onClick: goBack
  },
  {
    label: 'Transferir a otra cuenta',
    icon: 'i-lucide-arrow-left-right',
    variant: 'outline' as const,
    onClick: () => {
      Object.assign(transferForm, { destination_bank_account_id: '', amount: 0, date: transferDate(), reference: '', notes: '' })
      transferModalOpen.value = true
    }
  },
  {
    label: 'Registrar movimiento',
    icon: 'i-lucide-plus',
    color: 'primary' as const,
    variant: 'solid' as const,
    onClick: () => { movementModalOpen.value = true }
  }
])

const transferDestinations = computed(() => bankAccounts.value
  .filter(item => item.id !== accountId && item.active && item.currency_code === account.value?.currency_code)
  .map(item => ({ label: `${item.bank_name} · ${item.name} · ${formatCurrency(item.balance, item.currency_code)}`, value: item.id })))

const submitTransfer = async () => {
  if (transferring.value || !account.value || !transferForm.destination_bank_account_id || Number(transferForm.amount) <= 0) return
  transferring.value = true
  try {
    await createTransfer(accountId, { ...transferForm, amount: Number(transferForm.amount) })
    toast.add({ title: 'Transferencia registrada', description: 'Se actualizaron los saldos de ambas cuentas.', color: 'success' })
    transferModalOpen.value = false
    await Promise.all([fetchOne(accountId), fetchMovements(accountId), init()])
  } catch (error: any) {
    toast.add({ title: 'No se pudo transferir', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    transferring.value = false
  }
}

const closeTransferModal = () => {
  if (!transferring.value) transferModalOpen.value = false
}

const handleMovementSaved = async () => {
  await fetchOne(accountId)
  await fetchMovements(accountId)
}
</script>

<template>
  <UPage v-if="account" class="space-y-6 px-4">
    <AppPageHeader
      :title="account.name"
      :description="`${account.bank_name} · ${getAccountTypeConfig(account.account_type).label} · ${account.currency_code}`"
      :links="links"
    />

    <!-- ACCOUNT INFO -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo actual</p>
          <p class="text-2xl font-bold mt-1" :class="realBalance >= 0 ? 'text-foreground' : 'text-error'">
            {{ formatCurrency(realBalance, account.currency_code) }}
          </p>
          <p class="text-xs text-muted mt-1">
            <span :class="getCurrencyConfig(account.currency_code).color">
              {{ getCurrencyConfig(account.currency_code).icon }}
            </span>
            {{ getCurrencyConfig(account.currency_code).label }}
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total ingresos</p>
          <p class="text-xl font-bold mt-1 text-success">{{ formatCurrency(totalIn, account.currency_code) }}</p>
          <p class="text-xs text-muted mt-1">
            {{ incomeMovementCount }} movimientos
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total egresos</p>
          <p class="text-xl font-bold mt-1 text-error">{{ formatCurrency(totalOut, account.currency_code) }}</p>
          <p class="text-xs text-muted mt-1">
            {{ expenseMovementCount }} movimientos
          </p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Datos cuenta</p>
          <div class="mt-2 space-y-1">
            <p v-if="account.cbu" class="text-xs">
              <span class="text-muted">CBU:</span>
              <span class="font-mono font-medium">{{ account.cbu }}</span>
            </p>
            <p v-if="account.alias" class="text-xs">
              <span class="text-muted">Alias:</span>
              <span class="font-medium">{{ account.alias }}</span>
            </p>
            <p v-if="account.account_number" class="text-xs">
              <span class="text-muted">N°:</span>
              <span class="font-mono font-medium">{{ account.account_number }}</span>
            </p>
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

    <BankChargeRulesPanel :account-id="accountId" :currency-code="account.currency_code" />

    <RegisterBankMovementModal
      v-model:open="movementModalOpen"
      :account-id="accountId"
      :currency-code="account.currency_code"
      :current-balance="realBalance"
      @saved="handleMovementSaved"
    />

    <UModal v-model:open="transferModalOpen" title="Transferir entre cuentas" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="space-y-4">
          <UAlert color="info" variant="subtle" icon="i-lucide-arrow-left-right" :title="`${account.name} → destino`" description="Se registrarán juntos el débito de esta cuenta y el crédito de la cuenta destino. No es un gasto ni un ingreso." />
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField class="sm:col-span-2" label="Cuenta destino" required><USelectMenu v-model="transferForm.destination_bank_account_id" :items="transferDestinations" value-key="value" class="w-full" placeholder="Banco o billetera virtual" /></UFormField>
            <UFormField label="Importe" required><UInput v-model.number="transferForm.amount" type="number" min="0.01" step="0.01" class="w-full" :max="realBalance" /><p class="mt-1 text-xs text-muted">Disponible: {{ formatCurrency(realBalance, account.currency_code) }}</p></UFormField>
            <UFormField label="Fecha" required><UInput v-model="transferForm.date" type="date" class="w-full" /></UFormField>
            <UFormField label="Referencia"><UInput v-model="transferForm.reference" class="w-full" /></UFormField>
            <UFormField label="Observaciones"><UInput v-model="transferForm.notes" class="w-full" /></UFormField>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" variant="ghost" :disabled="transferring" @click="closeTransferModal" />
            <UButton label="Confirmar transferencia" icon="i-lucide-arrow-left-right" :loading="transferring" :disabled="transferring || !transferForm.destination_bank_account_id || Number(transferForm.amount) <= 0 || Number(transferForm.amount) > realBalance" @click="submitTransfer" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
