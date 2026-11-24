<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useBankConcepts } from '~/modulos/erp/bank-concepts/composable/useBankConcepts'
import type { CheckFormData } from '~/modulos/erp/checks/components/CheckForm.vue'
import CheckForm from '~/modulos/erp/checks/components/CheckForm.vue'
import { useIntakeRecordsService } from '~/modulos/erp/intake/intake-records.service'
import { useIntercompanyTreasuryService } from '~/modulos/erp/treasury/intercompany-treasury.service'
import type { BankAccountItem } from '~/modulos/erp/checks/components/CheckForm.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const intakeService = useIntakeRecordsService()
const intakeId = computed(() => route.query.intakeId as string | undefined)

const { create } = useChecks()
const { selectItems: localBankAccountItems, init: initBankAccounts } = useBankAccounts()
const sharedBankAccounts = ref<BankAccountItem[]>([])
const bankAccountItems = computed(() => [...localBankAccountItems.value, ...sharedBankAccounts.value])
const { codeSelectItems: currencyItems, init: initCurrencies } = useCurrencies()
const { concepts: bankConcepts, init: initBankConcepts } = useBankConcepts()
const bankConceptItems = computed(() => bankConcepts.value
  .filter(concept => concept.is_active && concept.nature === 'CREDIT' && concept.affects_balance)
  .map(concept => ({ label: `${concept.code} - ${concept.name}`, value: concept.id })))

const saving = ref(false)

const handleSubmit = async (formData: CheckFormData) => {
  if (saving.value) return
  saving.value = true
  try {
    const created = await create({
      check_number: formData.check_number,
      bank_name: formData.bank_name,
      bank_branch: formData.bank_branch || undefined,
      account_number: formData.account_number || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      bank_account_company_id: formData.bank_account_company_id || undefined,
      bank_account_external_id: formData.bank_account_external_id || undefined,
      bank_concept_id: formData.bank_account_company_id ? undefined : formData.bank_concept_id || undefined,
      bank_concept_external_id: formData.bank_account_company_id ? formData.bank_concept_id || undefined : undefined,
      issuer_name: formData.issuer_name,
      issuer_id: formData.issuer_id || undefined,
      amount: formData.amount,
      currency_code: formData.currency_code,
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      is_own: formData.is_own,
      check_format: formData.check_format,
      notes: formData.notes || undefined,
    })
    toast.add({ title: 'Cheque creado', color: 'success' })
    if (intakeId.value && created?.id) {
      await intakeService.complete(intakeId.value, 'CHECK', created.id)
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
  initBankConcepts().catch(() => undefined)
  Promise.all([
    useIntercompanyTreasuryService().findAvailable('PAYMENT'),
    useIntercompanyTreasuryService().findAvailable('COLLECTION'),
  ]).then(([paymentFunds, collectionFunds]) => {
    const funds = [...paymentFunds, ...collectionFunds]
    const uniqueFunds = [...new Map(funds.filter(fund => fund.fund_type === 'BANK_ACCOUNT').map(fund => [`${fund.company_id}:${fund.fund_id}`, fund])).values()]
    sharedBankAccounts.value = uniqueFunds.map(fund => ({
      label: `${fund.bank_name || fund.name} - ${fund.name} · ${fund.company_name} (${fund.currency_code})`,
      value: `shared:${fund.company_id}:${fund.fund_id}`,
      companyId: fund.company_id,
      externalId: fund.fund_id,
      bankName: fund.bank_name || fund.name,
      currencyCode: fund.currency_code,
    }))
  }).catch(() => { sharedBankAccounts.value = [] })
})
</script>

<template>
  <UPage class="space-y-4 max-w-5xl mx-auto">
    <AppPageHeader
      title="Nuevo cheque"
      description="Registrá un cheque propio o recibido de terceros con sus datos bancarios y vencimiento"
    />

    <UPageCard>
      <CheckForm
        :loading="saving"
        :bank-account-items="bankAccountItems"
        :bank-concept-items="bankConceptItems"
        :currency-items="currencyItems"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/checks')"
      />
    </UPageCard>
  </UPage>
</template>
