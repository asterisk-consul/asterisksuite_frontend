<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import type { CheckFormData } from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckForm from '~/modulos/erp/checks/components/CheckForm.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { getCheck, update } = useChecks()
const { selectItems: bankAccountItems, init: initBankAccounts } = useBankAccounts()
const { codeSelectItems: currencyItems, init: initCurrencies } = useCurrencies()

const check = ref<CheckFormData | null>(null)
const loadingData = ref(true)
const saving = ref(false)

const toInputDate = (date: string | null | undefined): string => {
  if (!date) return ''
  return date.split('T')[0]
}

onMounted(async () => {
  try {
    const id = route.params.id as string
    const data = await getCheck(id)
    if (!data) {
      toast.add({ title: 'Cheque no encontrado', color: 'error', icon: 'i-lucide-alert-circle' })
      router.push('/erp/treasury/checks')
      return
    }
    check.value = {
      id: data.id,
      check_number: data.check_number,
      bank_name: data.bank_name,
      bank_branch: data.bank_branch ?? '',
      account_number: data.account_number ?? '',
      bank_account_id: data.bank_account_id ?? '',
      issuer_name: data.issuer_name,
      issuer_id: data.issuer_id ?? '',
      amount: data.amount,
      currency_code: data.currency_code,
      issue_date: toInputDate(data.issue_date),
      due_date: toInputDate(data.due_date),
      is_own: data.is_own,
      notes: data.notes ?? '',
    }
  } catch (error: any) {
    toast.add({ title: 'Error al cargar cheque', description: error?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/treasury/checks')
  } finally {
    loadingData.value = false
    await initBankAccounts()
    await initCurrencies()
  }
})

const handleSubmit = async (formData: CheckFormData) => {
  if (!formData.id) return
  saving.value = true
  try {
    await update(formData.id, {
      check_number: formData.check_number,
      amount: Number(formData.amount),
      currency_code: formData.currency_code,
      issue_date: formData.issue_date || undefined,
      bank_name: formData.bank_name,
      bank_account_id: formData.bank_account_id || undefined,
      bank_branch: formData.bank_branch || undefined,
      account_number: formData.account_number || undefined,
      issuer_name: formData.issuer_name,
      issuer_id: formData.issuer_id || undefined,
      notes: formData.notes || undefined,
      due_date: formData.due_date || undefined,
    })
    toast.add({ title: 'Cheque actualizado', color: 'success' })
    router.push('/erp/treasury/checks')
  } catch (error: any) {
    toast.add({ title: 'Error al actualizar cheque', description: error?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4 max-w-2xl">
    <AppPageHeader
      title="Editar cheque"
      description="Editar datos del cheque"
    />

    <div v-if="loadingData" class="flex justify-center py-12">
      <ULoader />
    </div>

    <UPageCard v-else-if="check">
      <CheckForm
        :model-value="check"
        :loading="saving"
        :bank-account-items="bankAccountItems"
        :currency-items="currencyItems"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/checks')"
      />
    </UPageCard>
    <UiAttachmentManager
      v-if="check"
      entity-type="check"
      :entity-id="route.params.id as string"
      :readonly="false"
    />
  </UPage>
</template>
