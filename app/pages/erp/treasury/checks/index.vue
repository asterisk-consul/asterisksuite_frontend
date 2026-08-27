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

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const toast = useToast()
const router = useRouter()

const {
  checks,
  loading,
  init,
  remove,
  bounce,
  confirm,
  reject,
  deposit,
  revert
} = useChecks()

const bankAccountsService = useBankAccountsService()

const sorting = ref<SortingState>([])
const deleteModalOpen = ref(false)
const deletingCheck = ref<Check | null>(null)

// Deposit modal state
const depositModalOpen = ref(false)
const depositingCheck = ref<Check | null>(null)
const depositBankAccountId = ref('')
const depositAmount = ref(0)
const bankAccounts = ref<BankAccount[]>([])
const depositing = ref(false)

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
  depositAmount.value = Number(check.amount)
  depositBankAccountId.value = check.bank_account_id ?? ''

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
      amount: depositAmount.value
    })
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

onMounted(() => init())

const columns = checkColumns({
  onDetail: goToEdit,
  onEdit: goToEdit,
  onDelete: confirmDelete,
  onDeposit: openDepositModal,
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
      } else if (newStatus === 'BOUNCED') {
        await bounce(row.id)
      } else if (newStatus === 'CANCELLED') {
        await reject(row.id)
      }
    } catch (e: any) {
      row.status = prev
      console.error('Error changing check status:', e)
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
    <AppPageHeader
      title="Cheques"
      description="Gestión de cheques propios y de terceros"
      :links="links"
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
            <p class="text-sm font-semibold">{{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: depositingCheck.currency_code || 'ARS' }).format(Number(depositingCheck.amount)) }}</p>
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

          <div class="space-y-2">
            <label class="text-sm font-medium">Monto a depositar</label>
            <UInput
              v-model="depositAmount"
              type="number"
              :step="0.01"
              :min="0"
              placeholder="Monto"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton label="Cancelar" variant="ghost" @click="depositModalOpen = false" />
            <UButton
              label="Depositar"
              icon="i-lucide-building-2"
              color="success"
              :loading="depositing"
              :disabled="!depositBankAccountId || depositAmount <= 0"
              @click="handleDeposit"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
