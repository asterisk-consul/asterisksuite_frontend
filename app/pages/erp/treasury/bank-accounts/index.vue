<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { ButtonProps } from '@nuxt/ui'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import type { BankAccount, CreateBankAccountInput } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import { useExcelExport } from '~/composables/useExcelExport'

const { bankAccounts, loading, init, create, update, remove } = useBankAccounts()
const { exportToExcel } = useExcelExport()
const router = useRouter()

const modalOpen = ref(false)
const editingAccount = ref<BankAccount | null>(null)
const deleteModalOpen = ref(false)
const deletingAccount = ref<BankAccount | null>(null)
const searchQuery = ref('')

const form = reactive<CreateBankAccountInput>({
  name: '',
  bank_name: '',
  account_type: 'SAVINGS',
  cbu: '',
  alias: '',
  account_number: '',
  currency_code: 'ARS',
  balance: 0,
  active: true
})

onMounted(() => init())

const formatCurrency = (amount: number | string | null | undefined, currency = 'ARS') => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
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
  OTHER: { label: 'Otra', icon: 'i-lucide-circle-dot' }
}

const getCurrencyConfig = (code: string) =>
  CURRENCY_CONFIG[code] ?? { label: code, color: 'text-muted', icon: '💰', bg: 'bg-muted/10' }
const getAccountTypeConfig = (type: string) => ACCOUNT_TYPE_CONFIG[type] ?? { label: type, icon: 'i-lucide-circle-dot' }

const filteredAccounts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return bankAccounts.value
  return bankAccounts.value.filter(
    (a) =>
      a.name?.toLowerCase().includes(q) ||
      a.bank_name?.toLowerCase().includes(q) ||
      a.currency_code?.toLowerCase().includes(q)
  )
})

const totalByCurrency = computed(() => {
  const map = new Map<string, number>()
  for (const a of bankAccounts.value) {
    const code = a.currency_code || 'ARS'
    map.set(code, (map.get(code) || 0) + (Number(a.balance) || 0))
  }
  return Array.from(map.entries()).map(([currency, total]) => ({
    currency,
    total,
    config: getCurrencyConfig(currency)
  }))
})

const totalAll = computed(() => bankAccounts.value.reduce((sum, a) => sum + (Number(a.balance) || 0), 0))

const openCreate = () => {
  editingAccount.value = null
  Object.assign(form, {
    name: '',
    bank_name: '',
    account_type: 'SAVINGS',
    cbu: '',
    alias: '',
    account_number: '',
    currency_code: 'ARS',
    balance: 0,
    active: true
  })
  modalOpen.value = true
}

const openEdit = (account: BankAccount) => {
  editingAccount.value = account
  Object.assign(form, {
    name: account.name,
    bank_name: account.bank_name,
    account_type: account.account_type,
    cbu: account.cbu ?? '',
    alias: account.alias ?? '',
    account_number: account.account_number ?? '',
    currency_code: account.currency_code,
    balance: account.balance,
    active: account.active
  })
  modalOpen.value = true
}

const goToDetail = (account: BankAccount) => {
  router.push(`/erp/treasury/bank-accounts/${account.id}`)
}

const handleSubmit = async () => {
  try {
    if (editingAccount.value) {
      await update(editingAccount.value.id, { ...form })
    } else {
      await create({ ...form })
    }
    modalOpen.value = false
  } catch (error) {
    console.error(error)
  }
}

const confirmDelete = (account: BankAccount) => {
  deletingAccount.value = account
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingAccount.value) return
  await remove(deletingAccount.value.id)
  deleteModalOpen.value = false
  deletingAccount.value = null
}

const handleExport = () => {
  exportToExcel({
    filename: 'cuentas_bancarias',
    sheetName: 'Cuentas Bancarias',
    columns: [
      { key: 'name', label: 'Nombre', width: 25 },
      { key: 'bank_name', label: 'Banco', width: 20 },
      { key: 'account_type', label: 'Tipo', width: 20 },
      { key: 'currency_code', label: 'Moneda', width: 10 },
      { key: 'balance', label: 'Saldo', width: 15, format: (v) => Number(v || 0).toLocaleString('es-AR') },
      { key: 'cbu', label: 'CBU', width: 25 },
      { key: 'alias', label: 'Alias', width: 20 },
      { key: 'account_number', label: 'N° Cuenta', width: 20 },
      { key: 'active', label: 'Activa', width: 10, format: (v) => v ? 'Sí' : 'No' }
    ],
    data: filteredAccounts.value
  })
}

const links: ButtonProps[] = [
  {
    label: 'Exportar',
    icon: 'i-lucide-download',
    variant: 'ghost',
    onClick: handleExport
  },
  { label: 'Nueva cuenta', icon: 'i-heroicons-plus', color: 'primary', variant: 'solid', onClick: openCreate }
]

const accountTypes = [
  { label: 'Caja de ahorro', value: 'SAVINGS' },
  { label: 'Cuenta corriente', value: 'CHECKING' },
  { label: 'Cuenta sueldo', value: 'SALARY' },
  { label: 'Otra', value: 'OTHER' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Cuentas Bancarias" description="Gestión de cuentas bancarias de la empresa" :links="links" />

    <!-- SUMMARY BY CURRENCY -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
      <div
        v-for="item in totalByCurrency"
        :key="item.currency"
        class="flex items-center gap-4 p-4 rounded-xl border border-default bg-default"
      >
        <div class="size-12 rounded-xl flex items-center justify-center text-2xl shrink-0" :class="item.config.bg">
          {{ item.config.icon }}
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted font-medium uppercase">{{ item.config.label }}</p>
          <p class="text-lg font-bold truncate" :class="item.config.color">
            {{ formatCurrency(item.total, item.currency) }}
          </p>
          <p class="text-xs text-muted">
            {{ bankAccounts.filter((a) => a.currency_code === item.currency).length }} cuentas
          </p>
        </div>
      </div>
      <div
        v-if="totalByCurrency.length === 0 && !loading"
        class="flex items-center gap-4 p-4 rounded-xl border border-default bg-default"
      >
        <div class="size-12 rounded-xl bg-muted/10 flex items-center justify-center text-2xl shrink-0">💰</div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Sin cuentas</p>
          <p class="text-lg font-bold text-muted">$0.00</p>
        </div>
      </div>
    </div>

    <!-- SEARCH -->
    <UInput
      v-model="searchQuery"
      placeholder="Buscar por nombre, banco o moneda..."
      icon="i-lucide-search"
      class="max-w-md"
    />

    <!-- ACCOUNTS GRID -->
    <div v-if="loading" class="flex justify-center py-12">
      <ULoader />
    </div>

    <div v-else-if="filteredAccounts.length === 0" class="text-center py-12 text-muted">
      <UIcon name="i-lucide-landmark" class="size-12 mx-auto mb-3 opacity-30" />
      <p>No hay cuentas bancarias registradas</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
      <div
        v-for="account in filteredAccounts"
        :key="account.id"
        class="group relative p-5 rounded-xl border border-default bg-default hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        @click="goToDetail(account)"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-lg flex items-center justify-center shrink-0"
              :class="getCurrencyConfig(account.currency_code).bg"
            >
              <UIcon
                :name="getAccountTypeConfig(account.account_type).icon"
                class="size-5"
                :class="getCurrencyConfig(account.currency_code).color"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{{ account.name }}</p>
              <p class="text-xs text-muted truncate">{{ account.bank_name }}</p>
            </div>
          </div>
          <UBadge
            :label="account.currency_code"
            :color="account.currency_code === 'USD' ? 'success' : account.currency_code === 'EUR' ? 'info' : 'primary'"
            variant="soft"
            size="xs"
          />
        </div>

        <!-- Balance -->
        <div class="mb-4">
          <p class="text-xs text-muted font-medium uppercase mb-1">Saldo disponible</p>
          <p class="text-2xl font-bold" :class="Number(account.balance) >= 0 ? 'text-foreground' : 'text-error'">
            {{ formatCurrency(account.balance, account.currency_code) }}
          </p>
        </div>

        <!-- Details -->
        <div class="space-y-2 text-xs text-muted">
          <div class="flex items-center gap-2">
            <UIcon :name="getAccountTypeConfig(account.account_type).icon" class="size-3.5" />
            <span>{{ getAccountTypeConfig(account.account_type).label }}</span>
          </div>
          <div v-if="account.alias" class="flex items-center gap-2">
            <UIcon name="i-lucide-tag" class="size-3.5" />
            <span>{{ account.alias }}</span>
          </div>
          <div v-if="account.cbu" class="flex items-center gap-2">
            <UIcon name="i-lucide-hash" class="size-3.5" />
            <span class="font-mono">{{ account.cbu }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div
          class="flex items-center gap-1 mt-4 pt-3 border-t border-default opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <UButton icon="i-lucide-eye" variant="ghost" size="xs" @click.stop="goToDetail(account)" />
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click.stop="openEdit(account)" />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click.stop="confirmDelete(account)"
          />
        </div>
      </div>
    </div>

    <!-- CREATE/EDIT MODAL -->
    <UModal v-model:open="modalOpen" :title="editingAccount ? 'Editar cuenta' : 'Nueva cuenta bancaria'">
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleSubmit">
          <UFormField label="Nombre" name="name" required>
            <UInput v-model="form.name" placeholder="Nombre de la cuenta" />
          </UFormField>
          <UFormField label="Banco" name="bank_name" required>
            <UInput v-model="form.bank_name" placeholder="Nombre del banco" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Tipo" name="account_type">
              <USelectMenu v-model="form.account_type" :items="accountTypes" />
            </UFormField>
            <UFormField label="Moneda" name="currency_code">
              <UInput v-model="form.currency_code" placeholder="ARS" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="CBU" name="cbu">
              <UInput v-model="form.cbu" placeholder="CBU" />
            </UFormField>
            <UFormField label="Alias" name="alias">
              <UInput v-model="form.alias" placeholder="Alias" />
            </UFormField>
          </div>
          <UFormField label="Número de cuenta" name="account_number">
            <UInput v-model="form.account_number" placeholder="Número de cuenta" />
          </UFormField>
          <UFormField label="Saldo inicial" name="balance">
            <UInput v-model.number="form.balance" type="number" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton label="Guardar" type="submit" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar cuenta bancaria">
      <template #body>
        <p>
          ¿Estás seguro de que deseas eliminar la cuenta
          <strong>{{ deletingAccount?.name }}</strong>
          ?
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
