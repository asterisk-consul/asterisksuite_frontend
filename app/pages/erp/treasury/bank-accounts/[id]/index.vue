<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { h, resolveComponent } from 'vue'
import type { SortingState } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import type { BankAccountMovement, BankAccountMovementDetails } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { bankMovementColumns, getMovementSignedAmount, getMovementTypeBadge } from '~/modulos/erp/bank-accounts/movement-columns'
import RegisterBankMovementModal from '~/modulos/erp/bank-accounts/components/RegisterBankMovementModal.vue'
import BankChargeRulesPanel from '~/modulos/erp/bank-accounts/components/BankChargeRulesPanel.vue'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const accountId = route.params.id as string

const { current: account, movements, bankAccounts, init, createTransfer, fetchOne, fetchMovements, fetchMovementDetails, loading } = useBankAccounts()

const movementModalOpen = ref(false)
const transferModalOpen = ref(false)
const transferring = ref(false)
const movementDetailsOpen = ref(false)
const movementDetailsLoading = ref(false)
const selectedMovementDetails = ref<BankAccountMovementDetails | null>(null)
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

const detailsButton = resolveComponent('UButton')
const columns: TableColumn<BankAccountMovement>[] = [
  {
    id: 'details',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: { label: 'Detalle', disableColumnVisibility: true },
    cell: ({ row }) => h(detailsButton, {
      icon: 'i-lucide-eye',
      size: 'sm',
      color: 'neutral',
      variant: 'ghost',
      'aria-label': 'Ver detalle del movimiento',
      onClick: () => openMovementDetails(row.original)
    })
  },
  ...bankMovementColumns({ onSortFieldSelect })
]

async function openMovementDetails(movement: BankAccountMovement) {
  movementDetailsOpen.value = true
  movementDetailsLoading.value = true
  selectedMovementDetails.value = null
  try {
    selectedMovementDetails.value = await fetchMovementDetails(accountId, movement.id)
  } catch (error: any) {
    movementDetailsOpen.value = false
    toast.add({ title: 'No se pudo cargar el movimiento', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    movementDetailsLoading.value = false
  }
}

const movementChecks = computed(() => {
  const payment = selectedMovementDetails.value?.payment
  const checksById = new Map<string, { check: any; amountApplied?: number }>()
  for (const allocation of payment?.payment_allocations ?? []) {
    checksById.set(allocation.check.id, { check: allocation.check, amountApplied: Number(allocation.amount_applied) })
  }
  for (const check of payment?.checks ?? []) {
    if (!checksById.has(check.id)) checksById.set(check.id, { check })
  }
  const linkedCheck = selectedMovementDetails.value?.linked_check
  if (linkedCheck && !checksById.has(linkedCheck.id)) checksById.set(linkedCheck.id, { check: linkedCheck })
  return [...checksById.values()]
})

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const [year, month, day] = datePart.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const paymentMethodLabel: Record<string, string> = {
  CASH: 'Efectivo', CHECK: 'Cheque', BANK_TRANSFER: 'Transferencia bancaria', CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito', VIRTUAL_WALLET: 'Billetera virtual', PAYROLL_DEDUCTION: 'Descuento por recibo'
}
const paymentStatusLabel: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', PAID: 'Pagado', REVERSED: 'Revertido', CANCELLED: 'Cancelado'
}
const checkStatusLabel: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', CLEARED: 'Acreditado', BOUNCED: 'Rechazado', CANCELLED: 'Anulado'
}
const selectedMovementBadge = computed(() => selectedMovementDetails.value
  ? getMovementTypeBadge(selectedMovementDetails.value)
  : null)

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
          :on-row-click="openMovementDetails"
          v-model:sorting="sorting"
        />
      </div>
    </UPageCard>

    <UModal v-model:open="movementDetailsOpen" title="Detalle del movimiento" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="movementDetailsLoading" class="flex min-h-40 items-center justify-center gap-3 text-sm text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Cargando información relacionada…
        </div>
        <div v-else-if="selectedMovementDetails" class="space-y-5">
          <section class="grid gap-3 rounded-xl border border-default bg-elevated/40 p-4 sm:grid-cols-3">
            <div><p class="text-xs text-muted">Movimiento</p><UBadge v-if="selectedMovementBadge" :color="selectedMovementBadge.color as any" variant="subtle">{{ selectedMovementBadge.label }}</UBadge></div>
            <div><p class="text-xs text-muted">Fecha de operación</p><p class="font-medium">{{ formatDate(selectedMovementDetails.date) }}</p></div>
            <div><p class="text-xs text-muted">Importe</p><p class="font-semibold" :class="getMovementSignedAmount(selectedMovementDetails) >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(Math.abs(getMovementSignedAmount(selectedMovementDetails)), selectedMovementDetails.currency_code) }}</p></div>
            <div><p class="text-xs text-muted">Referencia</p><p class="font-medium break-all">{{ selectedMovementDetails.reference || '—' }}</p></div>
            <div><p class="text-xs text-muted">Fecha efectiva</p><p class="font-medium">{{ formatDate(selectedMovementDetails.effective_date) }}</p></div>
            <div><p class="text-xs text-muted">Saldo después</p><p class="font-medium">{{ formatCurrency(selectedMovementDetails.balance_after, selectedMovementDetails.currency_code) }}</p></div>
            <p v-if="selectedMovementDetails.description" class="text-sm text-muted sm:col-span-3">{{ selectedMovementDetails.description }}</p>
          </section>

          <section v-if="selectedMovementDetails.payment" class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="font-semibold">{{ selectedMovementDetails.payment.type === 'COLLECTION' ? 'Cobro' : selectedMovementDetails.payment.type === 'PAYMENT' ? 'Pago' : 'Gasto' }} #{{ selectedMovementDetails.payment.number }}</h4>
              <UBadge color="neutral" variant="subtle">{{ paymentStatusLabel[selectedMovementDetails.payment.status] || selectedMovementDetails.payment.status }}</UBadge>
            </div>
            <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p class="text-xs text-muted">Cliente / proveedor</p><p class="font-medium">{{ selectedMovementDetails.payment.party?.name || '—' }}</p><p v-if="selectedMovementDetails.payment.party?.tax_id" class="text-xs text-muted">CUIT {{ selectedMovementDetails.payment.party.tax_id }}</p></div>
              <div><p class="text-xs text-muted">Medio de pago</p><p class="font-medium">{{ paymentMethodLabel[selectedMovementDetails.payment.payment_method] || selectedMovementDetails.payment.payment_method }}</p></div>
              <div><p class="text-xs text-muted">Fecha del pago</p><p class="font-medium">{{ formatDate(selectedMovementDetails.payment.payment_date || selectedMovementDetails.payment.date) }}</p></div>
              <div><p class="text-xs text-muted">Importe del pago/cobro</p><p class="font-medium">{{ formatCurrency(selectedMovementDetails.payment.amount, selectedMovementDetails.payment.currency_code) }}</p></div>
              <div v-if="selectedMovementDetails.payment.reference"><p class="text-xs text-muted">Referencia</p><p class="font-medium">{{ selectedMovementDetails.payment.reference }}</p></div>
              <div v-if="selectedMovementDetails.payment.exchange_rate"><p class="text-xs text-muted">Cotización aplicada</p><p class="font-medium">{{ selectedMovementDetails.payment.exchange_rate }}</p></div>
              <p v-if="selectedMovementDetails.payment.description" class="text-sm text-muted sm:col-span-2">{{ selectedMovementDetails.payment.description }}</p>
            </div>

            <div v-if="selectedMovementDetails.payment.documents.length" class="space-y-2">
              <h5 class="text-sm font-medium">Comprobantes aplicados</h5>
              <div v-for="application in selectedMovementDetails.payment.documents" :key="application.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default px-3 py-2 text-sm">
                <span>{{ application.document.document_types.description }} {{ application.document.number }} · {{ formatDate(application.document.date) }}</span>
                <span class="font-medium">Aplicado {{ formatCurrency(application.amount_applied, application.document.currency_code || selectedMovementDetails.payment.currency_code) }}</span>
              </div>
            </div>

            <div v-if="movementChecks.length" class="space-y-2">
              <h5 class="text-sm font-medium">Cheques asociados</h5>
              <article v-for="item in movementChecks" :key="item.check.id" class="grid gap-3 rounded-xl border border-info/25 bg-info/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p class="text-xs text-muted">Cheque {{ item.check.is_own ? 'propio' : 'de terceros' }}</p><p class="font-semibold">N.º {{ item.check.check_number }}</p></div>
                <div><p class="text-xs text-muted">Banco emisor</p><p class="font-medium">{{ item.check.bank_name }}</p></div>
                <div><p class="text-xs text-muted">Emisor</p><p class="font-medium">{{ item.check.issuer_name }}</p><p v-if="item.check.issuer_id" class="text-xs text-muted">{{ item.check.issuer_id }}</p></div>
                <div><p class="text-xs text-muted">Estado</p><p class="font-medium">{{ checkStatusLabel[item.check.status] || item.check.status }}</p></div>
                <div><p class="text-xs text-muted">Importe del cheque</p><p class="font-medium">{{ formatCurrency(item.check.amount, item.check.currency_code) }}</p></div>
                <div v-if="item.amountApplied != null"><p class="text-xs text-muted">Aplicado a este pago</p><p class="font-medium">{{ formatCurrency(item.amountApplied, item.check.currency_code) }}</p></div>
                <div><p class="text-xs text-muted">Emisión / vencimiento</p><p class="font-medium">{{ formatDate(item.check.issue_date) }} / {{ formatDate(item.check.due_date) }}</p></div>
                <div><p class="text-xs text-muted">Depósito / acreditación</p><p class="font-medium">{{ formatDate(item.check.deposit_date) }} / {{ formatDate(item.check.clearing_date) }}</p></div>
              </article>
            </div>
          </section>

          <section v-if="!selectedMovementDetails.payment && movementChecks.length" class="space-y-2">
            <h4 class="font-semibold">Cheque asociado</h4>
            <article v-for="item in movementChecks" :key="item.check.id" class="grid gap-3 rounded-xl border border-info/25 bg-info/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p class="text-xs text-muted">Cheque {{ item.check.is_own ? 'propio' : 'de terceros' }}</p><p class="font-semibold">N.º {{ item.check.check_number }}</p></div>
              <div><p class="text-xs text-muted">Banco emisor</p><p class="font-medium">{{ item.check.bank_name }}</p></div>
              <div><p class="text-xs text-muted">Emisor</p><p class="font-medium">{{ item.check.issuer_name }}</p><p v-if="item.check.issuer_id" class="text-xs text-muted">{{ item.check.issuer_id }}</p></div>
              <div><p class="text-xs text-muted">Estado</p><p class="font-medium">{{ checkStatusLabel[item.check.status] || item.check.status }}</p></div>
              <div><p class="text-xs text-muted">Importe del cheque</p><p class="font-medium">{{ formatCurrency(item.check.amount, item.check.currency_code) }}</p></div>
              <div><p class="text-xs text-muted">Emisión / vencimiento</p><p class="font-medium">{{ formatDate(item.check.issue_date) }} / {{ formatDate(item.check.due_date) }}</p></div>
              <div><p class="text-xs text-muted">Depósito / acreditación</p><p class="font-medium">{{ formatDate(item.check.deposit_date) }} / {{ formatDate(item.check.clearing_date) }}</p></div>
            </article>
          </section>

          <section v-if="selectedMovementDetails.operation || selectedMovementDetails.charge" class="space-y-3">
            <h4 class="font-semibold">Desglose bancario</h4>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div v-if="selectedMovementDetails.operation" class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Importe bruto</p><p class="font-semibold">{{ formatCurrency(selectedMovementDetails.operation.gross_amount, selectedMovementDetails.currency_code) }}</p></div>
              <div v-if="selectedMovementDetails.operation" class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Comisiones / cargos</p><p class="font-semibold">{{ formatCurrency(selectedMovementDetails.operation.charges_amount, selectedMovementDetails.currency_code) }}</p></div>
              <div v-if="selectedMovementDetails.operation" class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Retenciones</p><p class="font-semibold">{{ formatCurrency(selectedMovementDetails.operation.retentions_amount, selectedMovementDetails.currency_code) }}</p></div>
              <div v-if="selectedMovementDetails.operation" class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Neto bancario</p><p class="font-semibold">{{ formatCurrency(selectedMovementDetails.operation.net_amount, selectedMovementDetails.currency_code) }}</p></div>
            </div>
            <div v-if="selectedMovementDetails.charge" class="rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm">
              {{ selectedMovementDetails.charge.concept_name_snapshot || 'Cargo bancario' }}: base {{ formatCurrency(selectedMovementDetails.charge.base_amount, selectedMovementDetails.currency_code) }} · impuesto {{ formatCurrency(selectedMovementDetails.charge.tax_amount, selectedMovementDetails.currency_code) }} · total {{ formatCurrency(selectedMovementDetails.charge.total_amount, selectedMovementDetails.currency_code) }}
              <span v-if="selectedMovementDetails.charge.certificate_number"> · Certificado {{ selectedMovementDetails.charge.certificate_number }}</span>
            </div>
          </section>
        </div>
        <div v-else class="py-8 text-center text-sm text-muted">No hay información adicional para este movimiento.</div>
      </template>
    </UModal>

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
