<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import PaymentForm from '~/modulos/erp/payments/components/PaymentForm.vue'
import type { PaymentFormData } from '~/modulos/erp/payments/components/PaymentForm.vue'

const route = useRoute()

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
const toast = useToast()

const partyId = computed(() => (route.query.party_id as string) || undefined)

const initialValues = computed<PaymentFormData | undefined>(() =>
  partyId.value
    ? {
        type: 'PAYMENT',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'CASH',
        amount: 0,
        currency_code: 'ARS',
        description: '',
        reference: '',
        party_id: partyId.value,
        bank_account_id: '',
        cash_box_id: '',
        check_ids: []
      }
    : undefined
)

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
    const apiPayload = {
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
      documents: formData.documents?.length ? formData.documents : undefined,
    }
    const created = await create(apiPayload)
    if (created?.id) {
      router.push(`/erp/treasury/payments/${created.id}`)
    } else {
      router.push('/erp/treasury/payments')
    }
  } catch (error: any) {
    toast.add({
      title: 'Error al crear pago',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
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
        v-model="initialValues"
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
