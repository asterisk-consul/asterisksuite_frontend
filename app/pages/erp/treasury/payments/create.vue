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
const documentId = computed(() => (route.query.document_id as string) || undefined)
const paymentType = computed(() => (route.query.type as 'PAYMENT' | 'COLLECTION') || 'PAYMENT')

const initialValues = ref<PaymentFormData | undefined>(
  partyId.value
    ? {
        type: paymentType.value,
        date: new Date().toISOString().split('T')[0],
        payment_method: 'CASH',
        amount: 0,
        currency_code: 'ARS',
        description: '',
        reference: '',
        party_id: partyId.value,
        bank_account_id: '',
        cash_box_id: '',
        check_ids: [],
        documents: documentId.value ? [{ document_id: documentId.value, amount_applied: 0 }] : undefined
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

  // Auto-seleccionar factura con el monto correcto después de cargar pending docs
  if (documentId.value && initialValues.value) {
    const allPending = [...pendingSalesDocuments.value, ...pendingPurchaseDocuments.value]
    const doc = allPending.find(d => d.id === documentId.value)
    if (doc) {
      initialValues.value = {
        ...initialValues.value,
        documents: [{ document_id: documentId.value, amount_applied: doc.pending_amount }]
      }
    }
  }
})

const handleSubmit = async (formData: PaymentFormData) => {
  try {
    const apiPayload = {
      type: formData.type,
      payment_mode: formData.payment_mode as any,
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
