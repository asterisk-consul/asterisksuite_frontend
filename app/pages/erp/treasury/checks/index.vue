<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { ButtonProps } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { checkColumns } from '~/modulos/erp/checks/columns'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import { useBankAccountsService } from '~/modulos/erp/bank-accounts/service/bank-accounts.service'
import type { BankAccount } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const intakeId = computed(() => route.query.intakeId as string | undefined)

const {
  checks,
  loading,
  init,
  remove,
  bounce,
  confirm,
  reject,
  deposit,
  collectInCashBox,
  debitOwnCheck,
  revert
} = useChecks()
const { cashBoxes, init: initCashBoxes } = useCashBoxes()

const bankAccountsService = useBankAccountsService()

const sorting = ref<SortingState>([])
const deleteModalOpen = ref(false)
const deletingCheck = ref<Check | null>(null)

// Deposit modal state
const depositModalOpen = ref(false)
const depositingCheck = ref<Check | null>(null)
const depositBankAccountId = ref('')
const depositAmount = ref(0)
const depositDate = ref('')
const bankAccounts = ref<BankAccount[]>([])
const depositing = ref(false)
const resolveModalOpen = ref(false)
const resolvingCheck = ref<Check | null>(null)
const cashBoxId = ref('')
const cashCollectionDate = ref('')
const resolving = ref(false)
const debitModalOpen = ref(false)
const debitingCheck = ref<Check | null>(null)
const debitDate = ref('')
const debiting = ref(false)

const todayInArgentina = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires'
}).format(new Date())

const dueThirdPartyChecks = computed(() => {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return checks.value.filter(check =>
    !check.is_own &&
    ['PENDING', 'CONFIRMED'].includes(check.status) &&
    new Date(check.due_date).getTime() <= endOfToday.getTime()
  )
})

const dueOwnChecks = computed(() => {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return checks.value.filter(check =>
    check.is_own &&
    check.status === 'CONFIRMED' &&
    new Date(check.due_date).getTime() <= endOfToday.getTime()
  )
})

const availableCashBoxes = computed(() => {
  if (!resolvingCheck.value) return []
  return cashBoxes.value.filter(box =>
    box.active &&
    box.status === 'OPEN' &&
    Boolean(box.current_session_id) &&
    box.currency_code === resolvingCheck.value?.currency_code
  )
})

const openResolveModal = async (check: Check) => {
  resolvingCheck.value = check
  cashBoxId.value = ''
  cashCollectionDate.value = todayInArgentina()
  await initCashBoxes()
  resolveModalOpen.value = true
}

const payWithCheck = () => {
  if (!resolvingCheck.value) return
  router.push({
    path: '/erp/treasury/payments/create',
    query: { type: 'PAYMENT', check_id: resolvingCheck.value.id }
  })
}

const depositResolvedCheck = () => {
  if (!resolvingCheck.value) return
  resolveModalOpen.value = false
  openDepositModal(resolvingCheck.value)
}

const collectResolvedCheck = async () => {
  if (!resolvingCheck.value || !cashBoxId.value) return
  resolving.value = true
  try {
    await collectInCashBox(resolvingCheck.value.id, cashBoxId.value, cashCollectionDate.value)
    toast.add({ title: 'Cheque cobrado e ingresado en caja', color: 'success' })
    resolveModalOpen.value = false
    await init()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || 'No se pudo cobrar el cheque', color: 'error' })
  } finally {
    resolving.value = false
  }
}

const rejectResolvedCheck = async () => {
  if (!resolvingCheck.value) return
  resolving.value = true
  try {
    await bounce(resolvingCheck.value.id)
    toast.add({ title: 'Cheque marcado como rechazado', color: 'warning' })
    resolveModalOpen.value = false
    await init()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || 'No se pudo rechazar el cheque', color: 'error' })
  } finally {
    resolving.value = false
  }
}

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

const goToCreate = () => {
  router.push('/erp/treasury/checks/create')
}

const goToEdit = (row: Check) => {
  router.push(`/erp/treasury/checks/${row.id}/edit`)
}

const confirmDelete = (check: Check) => {
  deletingCheck.value = check
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingCheck.value) return
  await remove(deletingCheck.value.id)
  deleteModalOpen.value = false
}

const openDepositModal = async (check: Check) => {
  depositingCheck.value = check
  depositAmount.value = Number(check.available_amount ?? check.amount)
  depositBankAccountId.value = check.bank_account_id ?? ''
  depositDate.value = todayInArgentina()

  if (bankAccounts.value.length === 0) {
    try {
      bankAccounts.value = await bankAccountsService.findAll()
    } catch {
      bankAccounts.value = []
    }
  }

  depositModalOpen.value = true
}

const filteredBankAccounts = computed(() => {
  if (!depositingCheck.value) return []
  return bankAccounts.value.filter(ba => ba.currency_code === depositingCheck.value!.currency_code && ba.active)
})

const handleDeposit = async () => {
  if (!depositingCheck.value) return
  if (!depositBankAccountId.value) {
    toast.add({ title: 'Seleccioná una cuenta bancaria', color: 'error' })
    return
  }
  if (depositAmount.value <= 0) {
    toast.add({ title: 'El monto debe ser mayor a 0', color: 'error' })
    return
  }

  try {
    depositing.value = true
    await deposit(depositingCheck.value.id, {
      bank_account_id: depositBankAccountId.value,
      amount: depositAmount.value,
      date: depositDate.value
    })
    if (intakeId.value) {
      await $fetch(`/api/intake-records/${intakeId.value}/complete`, {
        method: 'POST',
        body: { target_type: 'CHECK_DEPOSIT', target_id: depositingCheck.value.id }
      })
    }
    toast.add({ title: `Cheque #${depositingCheck.value.check_number} depositado correctamente`, color: 'success' })
    depositModalOpen.value = false
    await init()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Error al depositar el cheque', color: 'error' })
  } finally {
    depositing.value = false
  }
}

const handleRevert = async (check: Check) => {
  try {
    await revert(check.id)
    toast.add({ title: `Cheque #${check.check_number} revertido correctamente`, color: 'success' })
    await init()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Error al revertir el cheque', color: 'error' })
  }
}

const openDebitModal = (check: Check) => {
  debitingCheck.value = check
  debitDate.value = todayInArgentina()
  debitModalOpen.value = true
}

const processOwnCheck = async () => {
  if (!debitingCheck.value || !debitDate.value) return
  try {
    debiting.value = true
    await debitOwnCheck(debitingCheck.value.id, debitDate.value)
    toast.add({ title: `Débito del cheque #${debitingCheck.value.check_number} registrado`, color: 'success' })
    debitModalOpen.value = false
    await init()
  } catch (error: any) {
    toast.add({
      title: 'No se pudo procesar el débito',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    debiting.value = false
  }
}

onMounted(() => init())

const columns = checkColumns({
  onDetail: goToEdit,
  onEdit: goToEdit,
  onDelete: confirmDelete,
  onDeposit: openDepositModal,
  onResolve: openResolveModal,
  onProcess: openDebitModal,
  onRevert: handleRevert,
  onSortFieldSelect,
  onStatusChange: async (row, newStatus) => {
    if (newStatus === 'CLEARED') {
      openDepositModal(row)
      return
    }
    const prev = row.status
    try {
      row.status = newStatus
      if (newStatus === 'CONFIRMED') {
        await confirm(row.id)
        toast.add({
          title: 'Cheque confirmado',
          description: 'Al vencer se notificará. Registrá el débito cuando figure en el banco.',
          color: 'success'
        })
      } else if (newStatus === 'BOUNCED') {
        await bounce(row.id)
      } else if (newStatus === 'CANCELLED') {
        await reject(row.id)
      }
      await init()
    } catch (e: any) {
      row.status = prev
      toast.add({
        title: 'No se pudo cambiar el estado',
        description: e?.data?.message || e?.message,
        color: 'error'
      })
    }
  }
})

const links: ButtonProps[] = [
  {
    label: 'Nuevo cheque',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: goToCreate
  }
]

const filterFields: FilterField[] = [
  { id: 'check_number', label: 'Filtrar por N° cheque...', class: 'w-40' },
  { id: 'bank_name', label: 'Filtrar por banco...', class: 'w-40' },
  { id: 'issuer_name', label: 'Filtrar por emisor...', class: 'w-40' },
  { id: 'party_name', label: 'Filtrar por cliente/proveedor...', class: 'w-48' }
]

const sortFields: SortField[] = [
  { label: 'N° Cheque', value: 'check_number' },
  { label: 'Banco', value: 'bank_name' },
  { label: 'Emisor', value: 'issuer_name' },
  { label: 'Monto', value: 'amount' },
  { label: 'Emisión', value: 'issue_date' },
  { label: 'Vencimiento', value: 'due_date' },
  { label: 'Estado', value: 'status' }
]
</script>

<template>
  <UPage class="space-y-4">
    <UCard v-if="intakeId">
      <template #header>
        <div>
          <p class="font-medium">Comprobante recibido para depositar</p>
          <p class="text-sm text-muted">Revisá el archivo y elegí en la tabla el cheque correspondiente para depositarlo.</p>
        </div>
      </template>
      <UiAttachmentManager entity-type="intake" :entity-id="intakeId" readonly :allow-upload="false" />
    </UCard>
    <AppPageHeader
      title="Cheques"
      description="Gestión de cheques propios y de terceros"
      :links="links"
    />

    <UAlert
      v-if="dueThirdPartyChecks.length > 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-calendar-clock"
      :title="`${dueThirdPartyChecks.length} cheque(s) de terceros requieren una decisión`"
      description="Llegaron a su vencimiento y continúan en cartera. Podés depositarlos, cobrarlos por caja, entregarlos a un proveedor o mantenerlos pendientes."
    />

    <UAlert
      v-if="dueOwnChecks.length > 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-landmark"
      :title="`${dueOwnChecks.length} cheque(s) propio(s) requieren verificar el débito`"
      description="Llegaron a su vencimiento. Registrá el débito únicamente cuando figure en el banco, usando la fecha efectiva del movimiento."
    />

    <LogisticaTable
      :loading="loading"
      :data="checks"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar cheque">
      <template #body>
        <p>¿Estás seguro de que deseas eliminar el cheque N° <strong>{{ deletingCheck?.check_number }}</strong>?</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>

    <!-- DEPOSIT MODAL -->
    <UModal v-model:open="depositModalOpen" title="Depositar cheque" :ui="{ width: 'w-[420px]' }">
      <template #body>
        <div v-if="depositingCheck" class="space-y-4">
          <div class="rounded-lg bg-muted/50 p-3 space-y-1">
            <p class="text-sm font-medium">Cheque N° {{ depositingCheck.check_number }}</p>
            <p class="text-xs text-muted">{{ depositingCheck.bank_name }} — Emisor: {{ depositingCheck.issuer_name }}</p>
            <p class="text-sm font-semibold">{{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: depositingCheck.currency_code || 'ARS' }).format(Number(depositingCheck.available_amount ?? depositingCheck.amount)) }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Cuenta bancaria destino</label>
            <USelect
              v-model="depositBankAccountId"
              :items="filteredBankAccounts.map(ba => ({ label: `${ba.bank_name} - ${ba.name} ($${ba.balance})`, value: ba.id }))"
              placeholder="Seleccionar cuenta..."
            />
            <p v-if="filteredBankAccounts.length === 0" class="text-xs text-muted">
              No hay cuentas bancarias con la moneda {{ depositingCheck?.currency_code }}
            </p>
          </div>

          <UFormField label="Fecha efectiva del depósito" required>
            <UInput v-model="depositDate" type="date" class="w-full" />
          </UFormField>

          <UAlert
            color="info"
            variant="subtle"
            title="Depósito por el valor completo"
            description="El cheque saldrá de cartera y se acreditará íntegramente en la cuenta seleccionada."
          />

          <UiAttachmentManager
            entity-type="check_deposit"
            :entity-id="depositingCheck.id"
            :max-files="5"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton label="Cancelar" variant="ghost" @click="depositModalOpen = false" />
            <UButton
              label="Depositar"
              icon="i-lucide-building-2"
              color="success"
              :loading="depositing"
              :disabled="!depositBankAccountId || depositAmount <= 0 || !depositDate"
              @click="handleDeposit"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="resolveModalOpen" title="Resolver cheque de terceros" description="Elegí qué destino tendrá el cheque.">
      <template #body>
        <div v-if="resolvingCheck" class="space-y-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold">Cheque #{{ resolvingCheck.check_number }}</p>
                <p class="text-sm text-muted">{{ resolvingCheck.bank_name }} · {{ resolvingCheck.issuer_name }}</p>
                <p class="mt-1 text-xs text-muted">Vence: {{ new Date(resolvingCheck.due_date).toLocaleDateString('es-AR') }}</p>
              </div>
              <p class="font-semibold">{{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: resolvingCheck.currency_code }).format(Number(resolvingCheck.available_amount ?? resolvingCheck.amount)) }}</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <UButton label="Depositar en banco" icon="i-lucide-building-2" variant="outline" block @click="depositResolvedCheck" />
            <UButton label="Usar para pagar" icon="i-lucide-hand-coins" variant="outline" block @click="payWithCheck" />
          </div>

          <div class="rounded-xl border border-default p-4 space-y-3">
            <div>
              <p class="text-sm font-medium">Cobrar e ingresar en caja</p>
              <p class="text-xs text-muted">La caja debe estar abierta y operar en {{ resolvingCheck.currency_code }}.</p>
            </div>
            <div class="flex gap-2">
              <USelect
                v-model="cashBoxId"
                class="flex-1"
                :items="availableCashBoxes.map(box => ({ label: box.name, value: box.id }))"
                placeholder="Seleccionar caja abierta"
              />
              <UButton label="Cobrar" icon="i-lucide-banknote" color="success" :loading="resolving" :disabled="!cashBoxId || !cashCollectionDate" @click="collectResolvedCheck" />
            </div>
            <UFormField label="Fecha efectiva del cobro" required>
              <UInput v-model="cashCollectionDate" type="date" class="w-full" />
            </UFormField>
            <p v-if="availableCashBoxes.length === 0" class="text-xs text-warning">
              No hay cajas abiertas compatibles con la moneda del cheque.
            </p>
          </div>

          <div class="flex flex-wrap justify-between gap-2 border-t border-default pt-4">
            <UButton label="Marcar rechazado" icon="i-lucide-ban" color="error" variant="ghost" :loading="resolving" @click="rejectResolvedCheck" />
            <UButton label="Mantener en cartera" variant="ghost" @click="resolveModalOpen = false" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="debitModalOpen"
      title="Registrar débito bancario"
      description="El vencimiento solo genera un aviso. Confirmá el movimiento cuando ya figure en el banco."
    >
      <template #body>
        <div v-if="debitingCheck" class="space-y-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4">
            <p class="font-semibold">Cheque #{{ debitingCheck.check_number }}</p>
            <p class="text-sm text-muted">{{ debitingCheck.bank_name }} · vence {{ new Date(debitingCheck.due_date).toLocaleDateString('es-AR') }}</p>
            <p class="mt-2 text-lg font-semibold">
              {{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: debitingCheck.currency_code }).format(Number(debitingCheck.amount)) }}
            </p>
          </div>

          <UFormField label="Fecha efectiva del débito" required help="Usá la fecha que aparece en el extracto bancario.">
            <UInput v-model="debitDate" type="date" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="ghost" @click="debitModalOpen = false" />
            <UButton
              label="Registrar débito"
              icon="i-lucide-landmark"
              color="primary"
              :loading="debiting"
              :disabled="!debitDate"
              @click="processOwnCheck"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
