<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import BankStatementImportModal from '~/modulos/erp/bank-accounts/components/BankStatementImportModal.vue'
import { partitionCancelledTreasuryMovements } from '~/utils/treasuryMovementVisibility'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const accountId = route.params.id as string
const workspaceOpen = ref(true)
const { current: account, movements, fetchOne, fetchMovements, loading } = useBankAccounts()
const activeMovements = computed(() => partitionCancelledTreasuryMovements(movements.value).active)

onMounted(async () => {
  try {
    await Promise.all([fetchOne(accountId), fetchMovements(accountId)])
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir la conciliación', description: error?.data?.message || error?.message, color: 'error' })
    await router.replace(`/erp/treasury/bank-accounts/${accountId}`)
  }
})

watch(workspaceOpen, (isOpen) => {
  if (!isOpen) void router.push(`/erp/treasury/bank-accounts/${accountId}`)
})

async function refreshAccountAndMovements() {
  await Promise.all([fetchOne(accountId), fetchMovements(accountId)])
}
</script>

<template>
  <UPage v-if="account" class="min-h-0">
    <BankStatementImportModal
      v-model:open="workspaceOpen"
      :standalone="true"
      :account-id="accountId"
      :account-name="`${account.bank_name} · ${account.name}`"
      :currency-code="account.currency_code"
      :current-balance="Number(account.balance ?? 0)"
      :bank-accounting-account-id="account.accounting_account_id"
      :movements="activeMovements"
      @imported="refreshAccountAndMovements"
    />
  </UPage>
  <UPage v-else-if="loading" class="p-6">
    <div class="flex min-h-40 items-center justify-center gap-3 text-sm text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Cargando cuenta bancaria…
    </div>
  </UPage>
</template>
