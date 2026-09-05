<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import type { CheckFormData } from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckForm from '~/modulos/erp/checks/components/CheckForm.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const intakeId = computed(() => route.query.intakeId as string | undefined)

const { create } = useChecks()
const { selectItems: bankAccountItems, init: initBankAccounts } = useBankAccounts()
const { codeSelectItems: currencyItems, init: initCurrencies } = useCurrencies()

const saving = ref(false)

const handleSubmit = async (formData: CheckFormData) => {
  saving.value = true
  try {
    const created = await create({
      check_number: formData.check_number,
      bank_name: formData.bank_name,
      bank_branch: formData.bank_branch || undefined,
      account_number: formData.account_number || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      issuer_name: formData.issuer_name,
      issuer_id: formData.issuer_id || undefined,
      amount: formData.amount,
      currency_code: formData.currency_code,
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      is_own: formData.is_own,
      notes: formData.notes || undefined,
    })
    toast.add({ title: 'Cheque creado', color: 'success' })
    if (intakeId.value && created?.id) {
      await $fetch(`/api/intake-records/${intakeId.value}/complete`, {
        method: 'POST', body: { target_type: 'CHECK', target_id: created.id }
      })
    }
    router.push(created?.id ? `/erp/treasury/checks/${created.id}/edit` : '/erp/treasury/checks')
  } catch (error: any) {
    toast.add({ title: 'Error al crear cheque', description: error?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initBankAccounts()
  initCurrencies()
})
</script>

<template>
  <UPage class="space-y-4 max-w-2xl">
    <AppPageHeader
      title="Nuevo cheque"
      description="Crear un nuevo cheque propio o de terceros"
    />

    <UPageCard>
      <CheckForm
        :loading="saving"
        :bank-account-items="bankAccountItems"
        :currency-items="currencyItems"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/checks')"
      />
    </UPageCard>
  </UPage>
</template>
