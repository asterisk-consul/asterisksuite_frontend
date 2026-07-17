<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'

const {
  create,
  fetchPendingSalesDocuments,
  fetchPendingPurchaseDocuments,
  fetchAvailableOwnChecks,
  fetchAvailableCustomerChecks,
  pendingSalesDocuments,
  pendingPurchaseDocuments,
  availableOwnChecks,
  availableCustomerChecks,
  loading
} = usePayments()

const router = useRouter()

onMounted(async () => {
  await Promise.all([
    fetchPendingSalesDocuments(),
    fetchPendingPurchaseDocuments(),
    fetchAvailableOwnChecks(),
    fetchAvailableCustomerChecks()
  ])
})

const handleSubmit = async (formData: PaymentFormData) => {
  try {
    const created = await create({
      type: formData.type,
      date: formData.date,
      payment_method: formData.payment_method as any,
      amount: formData.amount,
      currency_code: formData.currency_code,
      description: formData.description || undefined,
      reference: formData.reference || undefined,
      party_id: formData.party_id || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      cash_box_id: formData.cash_box_id || undefined,
      check_ids: formData.check_ids?.length ? formData.check_ids : undefined,
    })
    if (created?.id) {
      router.push(`/erp/treasury/payments/${created.id}`)
    } else {
      router.push('/erp/treasury/payments')
    }
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Nuevo pago / cobro"
      description="Crear un nuevo pago o cobro"
    />

    <div class="max-w-4xl">
      <PaymentForm
        :pending-sales-documents="pendingSalesDocuments"
        :pending-purchase-documents="pendingPurchaseDocuments"
        :available-own-checks="availableOwnChecks"
        :available-customer-checks="availableCustomerChecks"
        :loading="loading"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/payments')"
      />
    </div>
  </UPage>
</template>
